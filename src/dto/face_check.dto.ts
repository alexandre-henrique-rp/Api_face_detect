import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class FaceCheckDto {
  @ApiProperty({ description: 'ID do usuário', example: 'user_123' })
  @IsString()
  user_id: string;

  @ApiProperty({ description: 'Status da validação', enum: ["APPROVED", "REJECTED"] })
  @IsString()
  @IsEnum(["APPROVED", "REJECTED"])
  status: "APPROVED" | "REJECTED";

  @ApiProperty({ description: 'ID do dossiê', example: 'dosie_456' })
  @IsString()
  dosie_id: string;

  @ApiProperty({ description: 'Observações opcionais', required: false })
  @IsString()
  @IsOptional()
  obs?: string;
}