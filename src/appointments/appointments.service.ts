import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, parsePagination } from "../common/utils/pagination";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";

type Tx = {
  client: PrismaService["client"];
  employee: PrismaService["employee"];
  appointment: PrismaService["appointment"];
  $executeRaw: PrismaService["$executeRaw"];
};

function parseDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid date for ${field}`);
  }
  return date;
}

function assertValidRange(startAt: Date, endAt: Date): void {
  if (!(endAt.getTime() > startAt.getTime())) {
    throw new BadRequestException("endAt must be later than startAt");
  }
}

async function assertClientExists(tx: Tx, clientId: string): Promise<void> {
  const client = await tx.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  });
  if (!client) {
    throw new BadRequestException("Client not found");
  }
}

async function assertActiveEmployee(tx: Tx, employeeId: string): Promise<void> {
  const employee = await tx.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    throw new BadRequestException("Employee not found");
  }
  if (!employee.active) {
    throw new BadRequestException("Employee is inactive");
  }
}

/**
 * Overlap check: cancelled appointments never block.
 * Two half-open intervals [start, end) overlap iff existing.start < new.end AND existing.end > new.start.
 * Boundary contact (existing.end == new.start) is allowed.
 */
async function findOverlapping(
  tx: Tx,
  employeeId: string,
  startAt: Date,
  endAt: Date,
  excludeAppointmentId?: string,
) {
  const where: Prisma.AppointmentWhereInput = {
    employeeId,
    status: { not: AppointmentStatus.CANCELLED },
    startAt: { lt: endAt },
    endAt: { gt: startAt },
  };
  if (excludeAppointmentId) {
    where.id = { not: excludeAppointmentId };
  }
  return tx.appointment.findFirst({
    where,
    select: { id: true, startAt: true, endAt: true, status: true },
  });
}

async function assertNoOverlap(
  tx: Tx,
  employeeId: string,
  startAt: Date,
  endAt: Date,
  excludeAppointmentId?: string,
): Promise<void> {
  const overlapping = await findOverlapping(
    tx,
    employeeId,
    startAt,
    endAt,
    excludeAppointmentId,
  );
  if (overlapping) {
    throw new ConflictException(
      `Employee already has an overlapping appointment (${overlapping.id})`,
    );
  }
}

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto, createdById: string) {
    // TODO: validate working hours / slot granularity (business rule not confirmed yet)
    const startAt = parseDate(dto.startAt, "startAt");
    const endAt = parseDate(dto.endAt, "endAt");
    assertValidRange(startAt, endAt);

    const status = dto.status ?? AppointmentStatus.SCHEDULED;
    if (status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException(
        "Cannot create an appointment with status CANCELLED. Use the cancel endpoint.",
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Serialize per-employee creation to prevent race conditions where two
        // concurrent requests reserve the same employee/time.
        // hashtextextended(text, seed) returns a bigint suitable for pg_advisory_xact_lock.

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.employeeId}, 0))`;

        await assertClientExists(tx, dto.clientId);
        await assertActiveEmployee(tx, dto.employeeId);
        await assertNoOverlap(tx, dto.employeeId, startAt, endAt);

        return tx.appointment.create({
          data: {
            clientId: dto.clientId,
            employeeId: dto.employeeId,
            createdById,
            startAt,
            endAt,
            source: dto.source,
            status,
            notes: dto.notes?.trim() || null,
          },
          include: { client: true, employee: true, createdBy: true },
        });
      },
      { timeout: 10000 },
    );
  }

  async list(
    pageRaw: string | undefined,
    limitRaw: string | undefined,
    query: {
      from?: string;
      to?: string;
      employeeId?: string;
      clientId?: string;
      status?: AppointmentStatus;
    },
  ) {
    const { page, limit } = parsePagination(pageRaw, limitRaw);
    const where: Prisma.AppointmentWhereInput = {};

    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.clientId) where.clientId = query.clientId;
    if (query.status) where.status = query.status;

    const from = query.from ? parseDate(query.from, "from") : undefined;
    const to = query.to ? parseDate(query.to, "to") : undefined;
    if (from && to && to.getTime() <= from.getTime()) {
      throw new BadRequestException("to must be later than from");
    }
    if (from || to) {
      // Overlap semantics: appointment interval [startAt, endAt) intersects [from, to).
      where.AND = [
        ...(from ? [{ endAt: { gt: from } }] : []),
        ...(to ? [{ startAt: { lt: to } }] : []),
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: { client: true, employee: true },
        orderBy: [{ startAt: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return paginate(data, total, { page, limit });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { client: true, employee: true, createdBy: true },
    });
    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }
    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    if (dto.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException(
        "Use PATCH /appointments/:id/cancel to cancel an appointment.",
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.appointment.findUnique({ where: { id } });
        if (!existing) {
          throw new NotFoundException("Appointment not found");
        }

        if (existing.status === AppointmentStatus.CANCELLED) {
          throw new ConflictException("Cannot update a cancelled appointment");
        }

        const nextClientId = dto.clientId ?? existing.clientId;
        const nextEmployeeId = dto.employeeId ?? existing.employeeId;
        const nextStartAt = dto.startAt
          ? parseDate(dto.startAt, "startAt")
          : existing.startAt;
        const nextEndAt = dto.endAt
          ? parseDate(dto.endAt, "endAt")
          : existing.endAt;
        assertValidRange(nextStartAt, nextEndAt);

        // Lock on the target employee (may differ from existing employee).

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${nextEmployeeId}, 0))`;

        if (dto.clientId !== undefined) {
          await assertClientExists(tx, nextClientId);
        }
        if (
          dto.employeeId !== undefined ||
          dto.startAt !== undefined ||
          dto.endAt !== undefined
        ) {
          await assertActiveEmployee(tx, nextEmployeeId);
          await assertNoOverlap(tx, nextEmployeeId, nextStartAt, nextEndAt, id);
        }

        const data: Prisma.AppointmentUpdateInput = {};
        if (dto.clientId !== undefined)
          data.client = { connect: { id: nextClientId } };
        if (dto.employeeId !== undefined)
          data.employee = { connect: { id: nextEmployeeId } };
        if (dto.startAt !== undefined) data.startAt = nextStartAt;
        if (dto.endAt !== undefined) data.endAt = nextEndAt;
        if (dto.source !== undefined) data.source = dto.source;
        if (dto.status !== undefined) data.status = dto.status;
        if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;

        return tx.appointment.update({
          where: { id },
          data,
          include: { client: true, employee: true, createdBy: true },
        });
      },
      { timeout: 10000 },
    );
  }

  async cancel(id: string, reason?: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.appointment.findUnique({ where: { id } });
        if (!existing) {
          throw new NotFoundException("Appointment not found");
        }

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${existing.employeeId}, 0))`;

        if (existing.status === AppointmentStatus.CANCELLED) {
          throw new ConflictException("Appointment already cancelled");
        }
        if (existing.status === AppointmentStatus.COMPLETED) {
          throw new ConflictException("Cannot cancel a completed appointment");
        }

        const notes = reason?.trim()
          ? existing.notes
            ? `${existing.notes}\nCancellation: ${reason.trim()}`
            : `Cancellation: ${reason.trim()}`
          : existing.notes;

        return tx.appointment.update({
          where: { id },
          data: { status: AppointmentStatus.CANCELLED, notes },
          include: { client: true, employee: true, createdBy: true },
        });
      },
      { timeout: 10000 },
    );
  }
}
