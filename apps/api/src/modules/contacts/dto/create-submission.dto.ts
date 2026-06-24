import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateSubmissionDto {
  @IsString({ always: true })
  @IsNotEmpty({ always: true })
  name!: string;

  @IsEmail({}, { always: true })
  email!: string;

  @IsString({ always: true })
  @IsNotEmpty({ groups: ["vip"], message: "Số điện thoại là bắt buộc đối với liên hệ VIP." })
  @IsOptional({ groups: ["default", "create"] })
  phone?: string;

  @IsOptional({ always: true })
  @IsString({ always: true })
  subject?: string;

  @IsString({ always: true })
  @IsNotEmpty({ always: true })
  message!: string;

  @IsOptional({ always: true })
  @IsString({ always: true })
  formSlug?: string;

  @IsOptional({ always: true })
  @IsObject({ always: true })
  metadata?: Record<string, unknown>;
}
