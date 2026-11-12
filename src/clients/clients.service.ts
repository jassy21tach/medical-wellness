import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, parsePagination } from "../common/utils/pagination";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone.trim(),
        email: dto.email?.trim().toLowerCase() || null,
      },
    });
  }

  async list(pageRaw?: string, limitRaw?: string, searchRaw?: string) {
    const { page, limit } = parsePagination(pageRaw, limitRaw);
    const search = (searchRaw ?? "").trim();
    const where: Prisma.ClientWhereInput = search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.client.count({ where }),
    ]);

    return paginate(data, total, { page, limit });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) {
      throw new NotFoundException("Client not found");
    }
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Client not found");
    }
    const data: Prisma.ClientUpdateInput = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.email !== undefined)
      data.email = dto.email?.trim().toLowerCase() || null;

    return this.prisma.client.update({ where: { id }, data });
  }
}
