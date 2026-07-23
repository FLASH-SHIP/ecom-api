import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class PreferenceChannelsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  webhook?: boolean;
}

export class UpdatePreferenceDto {
  @ApiProperty({ description: "Target notification type (e.g. order.status_updated)" })
  @IsString({ always: true })
  @IsNotEmpty({ always: true })
  eventType!: string;

  @ApiProperty({ description: "Optional channel overrides for this event" })
  @IsOptional({ always: true })
  @IsObject({ always: true })
  channels?: PreferenceChannelsDto;

  @ApiProperty({
    description:
      "Optional DND Quiet Hours configuration overrides (e.g. { enabled: true, start: '22:00', end: '06:00' })",
    required: false,
  })
  @IsOptional({ always: true })
  @IsObject({ always: true })
  dndConfig?: Record<string, unknown>;
}
