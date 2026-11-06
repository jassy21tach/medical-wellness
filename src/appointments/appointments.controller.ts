import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from "@nestjs/swagger";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../common/decorators/current-user.decorator";
import { AppointmentsService } from "./appointments.service";
import { CancelAppointmentDto } from "./dto/cancel-appointment.dto";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import { AppointmentStatus } from "@prisma/client";

@ApiTags("Appointments")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: "Create appointment" })
  @ApiResponse({ status: 201, description: "Appointment created" })
  @ApiResponse({
    status: 400,
    description:
      "Validation error / invalid date range / unknown or inactive employee",
  })
  @ApiResponse({
    status: 409,
    description: "Overlapping appointment for same employee",
  })
  async create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appointmentsService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: "List appointments (paginated, filterable)" })
  @ApiResponse({ status: 200, description: "Paginated appointments" })
  @ApiQuery({ name: "page", required: false, example: "1" })
  @ApiQuery({ name: "limit", required: false, example: "20" })
  @ApiQuery({
    name: "from",
    required: false,
    example: "2026-11-10T00:00:00.000Z",
  })
  @ApiQuery({
    name: "to",
    required: false,
    example: "2026-11-17T23:59:59.000Z",
  })
  @ApiQuery({ name: "employeeId", required: false })
  @ApiQuery({ name: "clientId", required: false })
  @ApiQuery({ name: "status", required: false, enum: AppointmentStatus })
  async list(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("employeeId") employeeId?: string,
    @Query("clientId") clientId?: string,
    @Query("status") status?: AppointmentStatus,
  ) {
    return this.appointmentsService.list(page, limit, {
      from,
      to,
      employeeId,
      clientId,
      status,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get appointment by id" })
  @ApiResponse({ status: 200, description: "Appointment" })
  @ApiResponse({ status: 404, description: "Not found" })
  async findOne(@Param("id") id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update appointment (cancellation must use /cancel)",
  })
  @ApiResponse({ status: 200, description: "Appointment updated" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 409, description: "Overlap or already cancelled" })
  @ApiResponse({ status: 404, description: "Not found" })
  async update(@Param("id") id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, dto);
  }

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancel appointment" })
  @ApiResponse({ status: 200, description: "Appointment cancelled" })
  @ApiResponse({ status: 409, description: "Already cancelled or completed" })
  @ApiResponse({ status: 404, description: "Not found" })
  async cancel(@Param("id") id: string, @Body() body: CancelAppointmentDto) {
    return this.appointmentsService.cancel(id, body?.reason);
  }
}
