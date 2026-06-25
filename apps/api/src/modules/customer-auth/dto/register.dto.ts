import { IsEmail, IsString, Length, MaxLength, MinLength } from "class-validator";
import { IsUnique } from "../../../common/validators/is-unique.validator";

export class RegisterDto {
  @IsEmail()
  @IsUnique("customer", "email", { message: "Email này đã được đăng ký." })
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @IsString()
  @Length(6, 6, { message: "Mã xác minh phải gồm 6 chữ số." })
  code!: string;
}
