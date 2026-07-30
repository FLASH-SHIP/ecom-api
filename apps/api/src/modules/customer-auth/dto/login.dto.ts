import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({
    type: () => String,
    description: "Customer email or account identifier",
    example: "customer@example.com",
  })
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({
    type: () => String,
    description: "Customer account password",
    example: "Password123!",
  })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({
    type: () => String,
    description: "Client type ('web' or 'mobile')",
    example: "web",
    required: false,
  })
  @IsString()
  @IsOptional()
  clientType?: "web" | "mobile";

  @ApiProperty({
    type: () => String,
    description: "Unique Device Identifier (for mobile apps)",
    example: "device-uuid-1234",
    required: false,
  })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiProperty({
    type: () => String,
    description: "Friendly Device Name (for mobile apps)",
    example: "iPhone 15 Pro",
    required: false,
  })
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiProperty({
    type: () => String,
    description: "Operating System (iOS, Android, etc.)",
    example: "iOS",
    required: false,
  })
  @IsString()
  @IsOptional()
  os?: string;

  @ApiProperty({
    type: () => String,
    description: "Operating System Version",
    example: "17.5.1",
    required: false,
  })
  @IsString()
  @IsOptional()
  osVersion?: string;
}
