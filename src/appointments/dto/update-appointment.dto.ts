import { ApiPropertyOptional } from "@nestjs/swagger";
import { AppointmentSource, AppointmentStatus } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ example: "2026-11-10T10:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ example: "2026-11-10T11:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({
    enum: AppointmentSource,
    example: AppointmentSource.WHATSAPP,
  })
  @IsOptional()
  @IsEnum(AppointmentSource)
  source?: AppointmentSource;

  @ApiPropertyOptional({
    enum: AppointmentStatus,
    example: AppointmentStatus.CONFIRMED,
    description:
      "Use PATCH /appointments/:id/cancel to cancel. CANCELLED via this endpoint is rejected.",
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: "Updated notes" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
