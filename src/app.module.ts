import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AppointmentsModule } from "./appointments/appointments.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { ClientsModule } from "./clients/clients.module";
import { EmployeesModule } from "./employees/employees.module";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"],
      validate: (env: Record<string, unknown>) => {
        const required = ["DATABASE_URL", "JWT_SECRET"];
        for (const key of required) {
          if (!env[key]) {
            throw new Error(`Missing required environment variable: ${key}`);
          }
        }
        const jwtSecret = String(env.JWT_SECRET);
        if (jwtSecret.length < 16) {
          throw new Error("JWT_SECRET must be at least 16 characters");
        }
        return env;
      },
    }),
    PrismaModule,
    AuthModule,
    ClientsModule,
    EmployeesModule,
    AppointmentsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
