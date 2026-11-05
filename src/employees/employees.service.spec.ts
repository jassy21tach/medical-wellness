import { NotFoundException } from "@nestjs/common";
import { EmployeesService } from "./employees.service";

describe("EmployeesService", () => {
  it("creates employee active by default", async () => {
    const prisma = {
      employee: {
        create: jest.fn().mockResolvedValue({ id: "e1", active: true }),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const service = new EmployeesService(prisma as never);
    await service.create({ firstName: "Nadia", lastName: "Demo" } as never);
    expect(prisma.employee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ active: true }),
      }),
    );
  });

  it("filters by active flag", async () => {
    const prisma = {
      employee: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const service = new EmployeesService(prisma as never);
    await service.list("true");
    expect(prisma.employee.findMany.mock.calls[0][0].where).toEqual({
      active: true,
    });
  });

  it("findOne throws when not found", async () => {
    const prisma = {
      employee: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new EmployeesService(prisma as never);
    await expect(service.findOne("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("deactivates employee via update", async () => {
    const prisma = {
      employee: {
        findUnique: jest.fn().mockResolvedValue({ id: "e1", active: true }),
        update: jest.fn().mockResolvedValue({ id: "e1", active: false }),
      },
    };
    const service = new EmployeesService(prisma as never);
    const result = await service.update("e1", { active: false } as never);
    expect(result.active).toBe(false);
  });
});
