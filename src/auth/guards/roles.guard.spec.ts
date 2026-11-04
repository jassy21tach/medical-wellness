import { ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

function makeContext(user: { role: string } | undefined) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => {},
    getClass: () => {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function makeReflector(requiredRoles: string[] | undefined) {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;
}

describe("RolesGuard", () => {
  it("allows when no roles required", () => {
    const guard = new RolesGuard(makeReflector(undefined));
    expect(guard.canActivate(makeContext({ role: "RECEPTION" }))).toBe(true);
  });

  it("allows ADMIN when ADMIN required", () => {
    const guard = new RolesGuard(makeReflector(["ADMIN"]));
    expect(guard.canActivate(makeContext({ role: "ADMIN" }))).toBe(true);
  });

  it("forbids RECEPTION when ADMIN required", () => {
    const guard = new RolesGuard(makeReflector(["ADMIN"]));
    expect(() => guard.canActivate(makeContext({ role: "RECEPTION" }))).toThrow(
      ForbiddenException,
    );
  });

  it("allows RECEPTION when RECEPTION required", () => {
    const guard = new RolesGuard(makeReflector(["RECEPTION"]));
    expect(guard.canActivate(makeContext({ role: "RECEPTION" }))).toBe(true);
  });

  it("forbids when unauthenticated", () => {
    const guard = new RolesGuard(makeReflector(["ADMIN"]));
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
