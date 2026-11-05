import { NotFoundException } from "@nestjs/common";
import { ClientsService } from "./clients.service";

describe("ClientsService", () => {
  it("creates client with trimmed email lowercased", async () => {
    const prisma = {
      client: {
        create: jest.fn().mockResolvedValue({ id: "c1" }),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const service = new ClientsService(prisma as never);
    await service.create({
      firstName: " Amina ",
      lastName: " Bennani ",
      phone: "+212600000001",
      email: "AMINA@Example.Local",
    } as never);
    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Amina",
          lastName: "Bennani",
          email: "amina@example.local",
        }),
      }),
    );
  });

  it("lists with search filter on name and phone", async () => {
    const prisma = {
      client: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: "c1", firstName: "Amina" }]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const service = new ClientsService(prisma as never);
    const result = await service.list("1", "20", "Amina");
    expect(result.data).toHaveLength(1);
    expect(prisma.client.findMany.mock.calls[0][0].where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          firstName: expect.objectContaining({ contains: "Amina" }),
        }),
        expect.objectContaining({
          phone: expect.objectContaining({ contains: "Amina" }),
        }),
      ]),
    );
  });

  it("findOne throws when not found", async () => {
    const prisma = {
      client: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new ClientsService(prisma as never);
    await expect(service.findOne("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("update throws when not found", async () => {
    const prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    const service = new ClientsService(prisma as never);
    await expect(
      service.update("missing", { firstName: "X" } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
