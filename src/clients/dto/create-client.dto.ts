import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateClientDto {
  @ApiProperty({ example: "Amina" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: "Bennani" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: "+212600000001" })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^\+?[0-9\s\-()]+$/, { message: "Invalid phone number" })
  phone!: string;

  @ApiPropertyOptional({ example: "amina.demo@example.local" })
  @IsOptional()
  @IsEmail()
  email?: string;
}
