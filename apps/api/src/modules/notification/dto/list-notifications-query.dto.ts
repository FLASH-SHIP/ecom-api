import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional } from "class-validator";

export class ListNotificationsQueryDto {
  @ApiProperty({
    description: "Cursor parameter (last notification ID received) for paginating",
    required: false,
  })
  @IsOptional({ always: true })
  @Type(() => Number)
  @IsNumber()
  cursor?: number;

  @ApiProperty({ description: "Number of notifications to load per batch", required: false })
  @IsOptional({ always: true })
  @Type(() => Number)
  @IsNumber()
  perPage?: number;

  @ApiProperty({
    description: "Retrieve only unread notifications if set to true",
    required: false,
  })
  @IsOptional({ always: true })
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;
}
