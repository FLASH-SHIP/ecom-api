import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional({
    type: () => String,
    description: "Unique username (3-30 chars, lowercase, numbers, dots, underscores)",
    example: "john_doe95",
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_.]{3,30}$/, {
    message:
      "Username must be 3-30 characters, only lowercase letters, numbers, dots and underscores",
  })
  username?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: "Full display name",
    example: "John Doe",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ type: () => String, description: "Phone number", example: "+84900000000" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    type: () => String,
    description: "Date of birth (YYYY-MM-DD)",
    example: "1995-05-15",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  dob?: string | null;

  @ApiPropertyOptional({
    type: () => String,
    enum: ["male", "female", "other"],
    example: "male",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  gender?: "male" | "female" | "other" | null;

  @ApiPropertyOptional({
    type: () => String,
    description: "Account bio / notes",
    example: "VIP Integration Account",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}
