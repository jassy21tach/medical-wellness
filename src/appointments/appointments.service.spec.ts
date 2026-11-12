import { BadRequestException, ConflictException } from "@nestjs/common";
import { AppointmentStatus } from "@prisma/client";
import { AppointmentsService } from "./appointments.service";
import type { PrismaService } from "../prisma/prisma.service";

function makePrisma(overrides: Record<string, unknown> = {}) {
  const mockTx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    client: { findUnique: jest.fn() },
    employee: { findUnique: jest.fn() },
    appointment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const invoke = jest.fn(
    async (callback: (tx: typeof mockTx) => Promise<unknown>) =>
      callback(mockTx),
  );
  const prisma = {
    $transaction: invoke,
    ...mockTx,
    _mockTx: mockTx,
  } as unknown as PrismaService & { _mockTx: typeof mockTx };
  for (const [k, v] of Object.entries(overrides)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockTx as any)[k] = v;
  }
  return { prisma, mockTx };
}

const CLIENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const EMPLOYEE_ID = "550e8400-e29b-41d4-a716-446655440001";
const OTHER_EMPLOYEE_ID = "550e8400-e29b-41d4-a716-446655440002";
const CREATOR_ID = "550e8400-e29b-41d4-a716-446655440003";

describe("AppointmentsService", () => {
  it("creates an appointment with valid client and active employee", async () => {
    const { prisma, mockTx } = makePrisma();
    mockTx.client.findUnique.mockResolvedValue({ id: CLIENT_ID });
    mockTx.employee.findUnique.mockResolvedValue({
      id: EMPLOYEE_ID,
      active: true,
    });
    mockTx.appointment.findFirst.mockResolvedValue(null);
    mockTx.appointment.create.mockResolvedValue({
      id: "apt-1",
      clientId: CLIENT_ID,
      employeeId: EMPLOYEE_ID,
    });

    const service = new AppointmentsService(prisma);
    const result = await service.create(
      {
        clientId: CLIENT_ID,
        employeeId: EMPLOYEE_ID,
        startAt: "2026-11-10T10:00:00.000Z",
        endAt: "2026-11-10T11:00:00.000Z",
        source: "PHONE",
      } as never,
      CREATOR_ID,
    );

    expect(result).toEqual({
      id: "apt-1",
      clientId: CLIENT_ID,
      employeeId: EMPLOYEE_ID,
    });
    expect(mockTx.appointment.create).toHaveBeenCalled();
    expect(mockTx.appointment.create.mock.calls[0][0].data.createdById).toBe(
      CREATOR_ID,
    );
  });

  it("rejects invalid date range (end <= start)", async () => {
    const { prisma } = makePrisma();
    const service = new AppointmentsService(prisma);
    await expect(
      service.create(
        {
          clientId: CLIENT_ID,
          employeeId: EMPLOYEE_ID,
          startAt: "2026-11-10T11:00:00.000Z",
          endAt: "2026-11-10T10:00:00.000Z",
          source: "PHONE",
        } as never,
        CREATOR_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects unknown client", async () => {
    const { prisma, mockTx } = makePrisma();
    mockTx.client.findUnique.mockResolvedValue(null);
    mockTx.employee.findUnique.mockResolvedValue({
      id: EMPLOYEE_ID,
      active: true,
    });
    const service = new AppointmentsService(prisma);
    await expect(
      service.create(
        {
          clientId: CLIENT_ID,
          employeeId: EMPLOYEE_ID,
          startAt: "2026-11-10T10:00:00.000Z",
          endAt: "2026-11-10T11:00:00.000Z",
          source: "PHONE",
        } as never,
        CREATOR_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects unknown employee", async () => {
    const { prisma, mockTx } = makePrisma();
    mockTx.client.findUnique.mockResolvedValue({ id: CLIENT_ID });
    mockTx.employee.findUnique.mockResolvedValue(null);
    const service = new AppointmentsService(prisma);
    await expect(
      service.create(
        {
          clientId: CLIENT_ID,
          employeeId: EMPLOYEE_ID,
          startAt: "2026-11-10T10:00:00.000Z",
          endAt: "2026-11-10T11:00:00.000Z",
          source: "PHONE",
        } as never,
        CREATOR_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects inactive employee", async () => {
    const { prisma, mockTx } = makePrisma();
    mockTx.client.findUnique.mockResolvedValue({ id: CLIENT_ID });
    mockTx.employee.findUnique.mockResolvedValue({
      id: EMPLOYEE_ID,
      active: false,
    });
    const service = new AppointmentsService(prisma);
    await expect(
      service.create(
        {
          clientId: CLIENT_ID,
          employeeId: EMPLOYEE_ID,
          startAt: "2026-11-10T10:00:00.000Z",
          endAt: "2026-11-10T11:00:00.000Z",
          source: "PHONE",
        } as never,
        CREATOR_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects overlapping appointment for same employee", async () => {
    const { prisma, mockTx } = makePrisma();
    mockTx.client.findUnique.mockResolvedValue({ id: CLIENT_ID });
    mockTx.employee.findUnique.mockResolvedValue({
      id: EMPLOYEE_ID,
      active: true,
    });
    mockTx.appointment.findFirst.mockResolvedValue({
      id: "apt-existing",
      startAt: new Date("2026-11-10T10:00:00Z"),
      endAt: new Date("2026-11-10T11:00:00Z"),
      status: "SCHEDULED",
    });
    const service = new AppointmentsService(prisma);
    await expect(
      service.create(
        {
          clientId: CLIENT_ID,
          employeeId: EMPLOYEE_ID,
          startAt: "2026-11-10T10:30:00.000Z",
          endAt: "2026-11-10T11:30:00.000Z",
          source: "PHONE",
        } as never,
        CREATOR_ID,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockTx.appointment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employeeId: EMPLOYEE_ID,
          status: { not: AppointmentStatus.CANCELLED },
          startAt: { lt: new Date("2026-11-10T11:30:00.000Z") },
          endAt: { gt: new Date("2026-11-10T10:30:00.000Z") },
        }),
      }),
    );
  });

  it("allows back-to-back appointments (boundary is not overlap)", async () => {
    const { prisma, mockTx } = makePrisma();
    mockTx.client.findUnique.mockResolvedValue({ id: CLIENT_ID });
    mockTx.employee.findUnique.mockResolvedValue({
      id: EMPLOYEE_ID,
      active: true,
    });
    mockTx.appointment.findFirst.mockResolvedValue(null);
    mockTx.appointment.create.mockResolvedValue({ id: "apt-2" });
    const service = new AppointmentsService(prisma);
    const result = await service.create(
      {
        clientId: CLIENT_ID,
        employeeId: EMPLOYEE_ID,
        startAt: "2026-11-10T11:00:00.000Z",
        endAt: "2026-11-10T12:00:00.000Z",
        source: "PHONE",
      } as never,
      CREATOR_ID,
    );
    expect(result).toEqual({ id: "apt-2" });
  });

  it("does not treat different employee overlap as conflict", async () => {
    const { prisma, mockTx } = makePrisma();
    mockTx.client.findUnique.mockResolvedValue({ id: CLIENT_ID });
    mockTx.employee.findUnique.mockResolvedValue({
      id: OTHER_EMPLOYEE_ID,
      active: true,
    });
    mockTx.appointment.findFirst.mockResolvedValue(null);
    mockTx.appointment.create.mockResolvedValue({ id: "apt-3" });
    const service = new AppointmentsService(prisma);
    const result = await service.create(
      {
        clientId: CLIENT_ID,
        employeeId: OTHER_EMPLOYEE_ID,
        startAt: "2026-11-10T10:00:00.000Z",
        endAt: "2026-11-10T11:00:00.000Z",
        source: "PHONE",
      } as never,
      CREATOR_ID,
    );
    expect(result).toEqual({ id: "apt-3" });
    expect(mockTx.appointment.findFirst.mock.calls[0][0].where.employeeId).toBe(
      OTHER_EMPLOYEE_ID,
    );
  });

  it("cancels appointment and allows it to no longer block (cancel flow)", async () => {
    const { prisma, mockTx } = makePrisma();
    mockTx.appointment.findUnique.mockResolvedValue({
      id: "apt-1",
      employeeId: EMPLOYEE_ID,
      status: AppointmentStatus.SCHEDULED,
      notes: null,
    });
    mockTx.appointment.update.mockResolvedValue({
      id: "apt-1",
      status: AppointmentStatus.CANCELLED,
    });
    const service = new AppointmentsService(prisma);
    const result = await service.cancel("apt-1", "client unavailable");
    expect(result.status).toBe(AppointmentStatus.CANCELLED);
    expect(mockTx.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: AppointmentStatus.CANCELLED }),
      }),
    );
  });

  it("rejects double cancel", async () => {
    const { prisma, mockTx } = makePrisma();
    mockTx.appointment.findUnique.mockResolvedValue({
      id: "apt-1",
      employeeId: EMPLOYEE_ID,
      status: AppointmentStatus.CANCELLED,
      notes: null,
    });
    const service = new AppointmentsService(prisma);
    await expect(service.cancel("apt-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("rejects cancelling a completed appointment", async () => {
    const { prisma, mockTx } = makePrisma();
    mockTx.appointment.findUnique.mockResolvedValue({
      id: "apt-1",
      employeeId: EMPLOYEE_ID,
      status: AppointmentStatus.COMPLETED,
      notes: null,
    });
    const service = new AppointmentsService(prisma);
    await expect(service.cancel("apt-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("updates appointment time with overlap exclusion of self", async () => {
    const { prisma, mockTx } = makePrisma();
    mockTx.appointment.findUnique.mockResolvedValue({
      id: "apt-1",
      clientId: CLIENT_ID,
      employeeId: EMPLOYEE_ID,
      startAt: new Date("2026-11-10T10:00:00Z"),
      endAt: new Date("2026-11-10T11:00:00Z"),
      status: AppointmentStatus.SCHEDULED,
    });
    mockTx.employee.findUnique.mockResolvedValue({
      id: EMPLOYEE_ID,
      active: true,
    });
    mockTx.appointment.findFirst.mockResolvedValue(null);
    mockTx.appointment.update.mockResolvedValue({
      id: "apt-1",
      startAt: new Date("2026-11-10T12:00:00Z"),
    });
    const service = new AppointmentsService(prisma);
    const result = await service.update("apt-1", {
      startAt: "2026-11-10T12:00:00.000Z",
      endAt: "2026-11-10T13:00:00.000Z",
    } as never);
    expect(result).toBeDefined();
    expect(mockTx.appointment.findFirst.mock.calls[0][0].where.id).toEqual({
      not: "apt-1",
    });
  });

  it("rejects update to CANCELLED via generic update (must use /cancel)", async () => {
    const { prisma } = makePrisma();
    const service = new AppointmentsService(prisma);
    await expect(
      service.update("apt-1", { status: AppointmentStatus.CANCELLED } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
