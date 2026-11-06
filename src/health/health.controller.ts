import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Health check (includes DB connectivity)" })
  @ApiResponse({ status: 200, description: "Service healthy" })
  @ApiResponse({ status: 503, description: "Database unavailable" })
  async check() {
    let dbUp = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch {
      dbUp = false;
    }
    return {
      status: dbUp ? "ok" : "degraded",
      database: dbUp ? "up" : "down",
      timestamp: new Date().toISOString(),
    };
  }
}
