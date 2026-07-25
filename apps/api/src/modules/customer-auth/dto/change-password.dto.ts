import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ type: () => String, description: "Current account password", example: "OldPassword123!" })
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @ApiProperty({ type: () => String, description: "New password (at least 8 characters)", example: "NewPassword123!" })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword!: string;
}
