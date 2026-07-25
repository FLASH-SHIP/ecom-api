import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({
    type: () => String,
    description: "Registered account email address",
    example: "customer@example.com",
  })
  @IsEmail()
  email!: string;
}
