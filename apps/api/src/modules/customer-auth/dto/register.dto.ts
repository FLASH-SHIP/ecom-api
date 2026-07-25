import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Length, MaxLength, MinLength } from "class-validator";
import { IsUnique } from "../../../common/validators/is-unique.validator.js";

export class RegisterDto {
  @ApiProperty({ type: () => String, description: "Customer email address", example: "customer@example.com" })
  @IsEmail()
  @IsUnique("customer", "email", { message: "Email này đã được đăng ký." })
  email!: string;

  @ApiProperty({ type: () => String, description: "New password (at least 8 characters)", example: "Password123!" })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @ApiProperty({ type: () => String, description: "6-digit email verification code", example: "123456" })
  @IsString()
  @Length(6, 6, { message: "Mã xác minh phải gồm 6 chữ số." })
  code!: string;
}
