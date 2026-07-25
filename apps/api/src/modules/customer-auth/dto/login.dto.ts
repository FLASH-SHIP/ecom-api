import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

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
}
