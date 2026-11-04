import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, IsNotEmpty, MaxLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin@example.local" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "ChangeMeDevOnly!2026" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password!: string;
}
