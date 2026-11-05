import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateClientDto {
  @ApiPropertyOptional({ example: "Amina2" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: "Bennani2" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: "+212600000001" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^\+?[0-9\s\-()]+$/, { message: "Invalid phone number" })
  phone?: string;

  @ApiPropertyOptional({ example: "amina.demo@example.local" })
  @IsOptional()
  @IsEmail()
  email?: string;
}
