import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_.]{3,30}$/, {
    message:
      "Username must be 3-30 characters, only lowercase letters, numbers, dots and underscores",
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  dob?: string | null;

  @IsOptional()
  @IsString()
  gender?: "male" | "female" | "other" | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}
