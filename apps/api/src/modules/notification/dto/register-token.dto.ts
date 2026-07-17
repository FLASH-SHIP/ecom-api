import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RegisterTokenDto {
  @ApiProperty({ description: "Firebase Cloud Messaging device token string" })
  @IsString({ always: true })
  @IsNotEmpty({ always: true })
  token!: string;

  @ApiProperty({ description: "Client device platform type (ios, android, web)" })
  @IsString({ always: true })
  @IsNotEmpty({ always: true })
  platform!: string;

  @ApiProperty({
    description: "Optional metadata describing client device model and OS",
    required: false,
  })
  @IsOptional({ always: true })
  @IsString({ always: true })
  deviceInfo?: string;
}
