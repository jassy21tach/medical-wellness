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

function toDate(value: string, field: string): Date {
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid date for ${field}`);
  }
  return d;
}

function checkRange(start: Date, end: Date) {
  if (end.getTime() <= start.getTime()) {
    throw new BadRequestException("endAt must be later than startAt");
  }
}

async function checkClient(tx: Tx, clientId: string) {
  const c = await tx.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  });
  if (!c) throw new BadRequestException("Client not found");
}

async function checkEmployee(tx: Tx, employeeId: string) {
  const emp = await tx.employee.findUnique({ where: { id: employeeId } });
  if (!emp) throw new BadRequestException("Employee not found");
  if (!emp.active) throw new BadRequestException("Employee is inactive");
}

async function checkOverlap(
  tx: Tx,
  employeeId: string,
  startAt: Date,
  endAt: Date,
  ignoreId?: string,
) {
  const where: Prisma.AppointmentWhereInput = {
    employeeId,
    status: { not: AppointmentStatus.CANCELLED },
    startAt: { lt: endAt },
    endAt: { gt: startAt },
  };
  if (ignoreId) where.id = { not: ignoreId };

  const found = await tx.appointment.findFirst({
    where,
    select: { id: true, startAt: true, endAt: true, status: true },
  });
  if (found) {
    throw new ConflictException(
      `Employee already has an overlaping appointment (${found.id})`,
    );
  }
}

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto, createdById: string) {
    // TODO working hours check, waiting for the client to tell us
    const startAt = toDate(dto.startAt, "startAt");
    const endAt = toDate(dto.endAt, "endAt");
    checkRange(startAt, endAt);

    const status = dto.status ?? AppointmentStatus.SCHEDULED;
    if (status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException(
        "Cannot create an appointment with status CANCELLED. Use the cancel endpoint.",
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.employeeId}, 0))`;

        await checkClient(tx, dto.clientId);
        await checkEmployee(tx, dto.employeeId);
        await checkOverlap(tx, dto.employeeId, startAt, endAt);

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
          include: {
            client: true,
            employee: true,
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
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

    const from = query.from ? toDate(query.from, "from") : undefined;
    const to = query.to ? toDate(query.to, "to") : undefined;
    if (from && to && to.getTime() <= from.getTime()) {
      throw new BadRequestException("to must be later than from");
    }

    if (from || to) {
      where.AND = [
        ...(from ? [{ endAt: { gt: from } }] : []),
        ...(to ? [{ startAt: { lt: to } }] : []),
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: { client: true, employee: true },
        orderBy: { startAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    // console.log("appointments", data.length);
    return paginate(data, total, { page, limit });
  }

  async findOne(id: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        client: true,
        employee: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!appt) throw new NotFoundException("Appointment not found");
    return appt;
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
        if (!existing) throw new NotFoundException("Appointment not found");

        if (existing.status === AppointmentStatus.CANCELLED) {
          throw new ConflictException("Cannot update a cancelled appointment");
        }

        const clientId = dto.clientId ?? existing.clientId;
        const employeeId = dto.employeeId ?? existing.employeeId;
        const startAt = dto.startAt
          ? toDate(dto.startAt, "startAt")
          : existing.startAt;
        const endAt = dto.endAt ? toDate(dto.endAt, "endAt") : existing.endAt;
        checkRange(startAt, endAt);

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${employeeId}, 0))`;

        if (dto.clientId !== undefined) {
          await checkClient(tx, clientId);
        }

        const timeOrEmployeeChanged =
          dto.employeeId !== undefined ||
          dto.startAt !== undefined ||
          dto.endAt !== undefined;
        if (timeOrEmployeeChanged) {
          await checkEmployee(tx, employeeId);
          await checkOverlap(tx, employeeId, startAt, endAt, id);
        }

        const data: Prisma.AppointmentUpdateInput = {};
        if (dto.clientId !== undefined)
          data.client = { connect: { id: clientId } };
        if (dto.employeeId !== undefined)
          data.employee = { connect: { id: employeeId } };
        if (dto.startAt !== undefined) data.startAt = startAt;
        if (dto.endAt !== undefined) data.endAt = endAt;
        if (dto.source !== undefined) data.source = dto.source;
        if (dto.status !== undefined) data.status = dto.status;
        if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;

        return tx.appointment.update({
          where: { id },
          data,
          include: {
            client: true,
            employee: true,
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });
      },
      { timeout: 10000 },
    );
  }

  async cancel(id: string, reason?: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.appointment.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException("Appointment not found");

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${existing.employeeId}, 0))`;

        if (existing.status === AppointmentStatus.CANCELLED) {
          throw new ConflictException("Appointment already cancelled");
        }
        if (existing.status === AppointmentStatus.COMPLETED) {
          throw new ConflictException("Cannot cancel a completed appointment");
        }

        let notes = existing.notes;
        const r = reason?.trim();
        if (r) {
          notes = notes ? `${notes}\nCancellation: ${r}` : `Cancellation: ${r}`;
        }

        return tx.appointment.update({
          where: { id },
          data: { status: AppointmentStatus.CANCELLED, notes },
          include: {
            client: true,
            employee: true,
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });
      },
      { timeout: 10000 },
    );
  }
}
