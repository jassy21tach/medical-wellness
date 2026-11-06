import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AppointmentSource, AppointmentStatus } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateAppointmentDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ example: "2026-11-10T10:00:00.000Z" })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: "2026-11-10T11:00:00.000Z" })
  @IsDateString()
  endAt!: string;

  @ApiProperty({ enum: AppointmentSource, example: AppointmentSource.PHONE })
  @IsEnum(AppointmentSource)
  source!: AppointmentSource;

  @ApiPropertyOptional({
    enum: AppointmentStatus,
    example: AppointmentStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: "Notes optional" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
