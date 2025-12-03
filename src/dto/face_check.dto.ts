import { IsEnum, IsString } from "class-validator";

export class FaceCheckDto {
  @IsString()
  user_id: string;

  @IsString()
  @IsEnum(["APPROVED", "REJECTED"])
  status: "APPROVED" | "REJECTED";
  
  @IsString()
  dosie_id: string;

  @IsString()
  obs?: string;
}