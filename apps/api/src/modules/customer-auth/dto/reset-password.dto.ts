import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({
    type: () => String,
    description: "Password reset verification token received via email",
    example: "reset_token_abc123",
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    type: () => String,
    description: "New password (at least 8 characters)",
    example: "NewPassword123!",
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}
