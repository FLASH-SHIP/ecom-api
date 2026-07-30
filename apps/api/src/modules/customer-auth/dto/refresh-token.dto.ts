import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({
    type: () => String,
    description: "Customer JWT Refresh Token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;

  @ApiProperty({
    type: () => String,
    description: "Client type ('web' or 'mobile')",
    example: "web",
    required: false,
  })
  @IsString()
  @IsOptional()
  clientType?: "web" | "mobile";
}
