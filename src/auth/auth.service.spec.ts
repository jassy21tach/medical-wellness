import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const plain = "StrongPass!2026";
  let hash: string;

  beforeAll(async () => {
    hash = await bcrypt.hash(plain, 4);
  });

  function setup(user: unknown) {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
    const jwt = { signAsync: jest.fn().mockResolvedValue("fake-jwt") };
    const config = { get: jest.fn().mockReturnValue("1h") };
    const service = new AuthService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jwt as any as JwtService,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config as any as ConfigService,
    );
    return { service, jwt, prisma };
  }

  it("logs in successfully and never returns password hash", async () => {
    const { service } = setup({
      id: "u1",
      email: "admin@example.local",
      passwordHash: hash,
      firstName: "Admin",
      lastName: "Demo",
      role: "ADMIN",
      active: true,
    });
    const result = await service.login("admin@example.local", plain);
    expect(result.accessToken).toBe("fake-jwt");
    expect(result.user).toEqual({
      id: "u1",
      email: "admin@example.local",
      firstName: "Admin",
      lastName: "Demo",
      role: "ADMIN",
      active: true,
    });
    expect(JSON.stringify(result)).not.toContain(hash);
  });

  it("rejects incorrect password", async () => {
    const { service } = setup({
      id: "u1",
      email: "admin@example.local",
      passwordHash: hash,
      role: "ADMIN",
      active: true,
      firstName: "A",
      lastName: "B",
    });
    await expect(
      service.login("admin@example.local", "wrong"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects unknown email with generic error (no enumeration)", async () => {
    const { service } = setup(null);
    await expect(
      service.login("nope@example.local", plain),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects inactive user", async () => {
    const { service } = setup({
      id: "u1",
      email: "admin@example.local",
      passwordHash: hash,
      role: "ADMIN",
      active: false,
      firstName: "A",
      lastName: "B",
    });
    await expect(
      service.login("admin@example.local", plain),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("normalizes email to lowercase when looking up", async () => {
    const { service, prisma } = setup({
      id: "u1",
      email: "admin@example.local",
      passwordHash: hash,
      role: "ADMIN",
      active: true,
      firstName: "A",
      lastName: "B",
    });
    await service.login("  ADMIN@Example.Local ", plain);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "admin@example.local" },
    });
  });
});
