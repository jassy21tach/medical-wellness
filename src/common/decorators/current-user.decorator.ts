import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
