import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class CancelAppointmentDto {
  @ApiPropertyOptional({
    example: "Client requested cancellation",
    description: "Optional reason recorded in notes.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
