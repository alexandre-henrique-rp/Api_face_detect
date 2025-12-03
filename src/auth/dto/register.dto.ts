import { Transform } from "class-transformer";
import { IsEmail, IsString } from "class-validator";

export class RegisterDto {
  @IsEmail({}, { message: 'Email must be a valid email' })
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @IsString({ message: 'Name must be a string' })
  @Transform(({ value }) => value.toUpperCase())
  name: string;

  @IsString({ message: 'Rota response must be a string' })
  @Transform(({ value }) => value.toLowerCase())
  rota_response: string;
}