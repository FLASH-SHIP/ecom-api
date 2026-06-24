import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

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
}
