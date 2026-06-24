import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateSubmissionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  formSlug?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
