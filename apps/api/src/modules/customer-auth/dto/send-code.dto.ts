import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class SendCodeDto {
  @ApiProperty({ type: () => String, description: "Target email address to receive 6-digit verification code", example: "customer@example.com" })
  @IsEmail()
  email!: string;
}
