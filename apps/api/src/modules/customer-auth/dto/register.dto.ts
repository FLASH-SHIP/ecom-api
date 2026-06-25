import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { IsUnique } from "../../../common/validators/is-unique.validator";

export class RegisterDto {
  @IsEmail()
  @IsUnique("customer", "email", { message: "Email này đã được đăng ký." })
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @IsOptional()
  @IsString()
  @IsUnique("customer", "username", { message: "Tên đăng nhập này đã được sử dụng." })
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
