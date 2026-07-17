import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";

export class TrackNotificationDto {
  @ApiProperty({
    description: "Delivery tracking action (delivered | clicked)",
    enum: ["delivered", "clicked"],
  })
  @IsNotEmpty({ always: true })
  @IsEnum(["delivered", "clicked"], { always: true })
  action!: "delivered" | "clicked";
}
