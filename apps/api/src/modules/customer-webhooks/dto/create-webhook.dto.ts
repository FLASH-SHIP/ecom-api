import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, IsUrl } from "class-validator";

export class CreateCustomerWebhookDto {
  @ApiProperty({ type: () => String, description: "Human-readable webhook subscription name", example: "ERP Order Status Updates" })
  @IsString()
  name!: string;

  @ApiProperty({ type: () => String, description: "HTTPS webhook listener endpoint URL", example: "https://example.com/api/webhooks/ecom" })
  @IsUrl({}, { message: "URL webhook phải hợp lệ" })
  url!: string;

  @ApiProperty({ type: () => [String], description: "List of subscribed event topics", example: ["order.created", "order.updated"] })
  @IsArray()
  @IsString({ each: true })
  events!: string[];

  @ApiPropertyOptional({ type: () => String, description: "Target API version schema", example: "2026-07-16" })
  @IsOptional()
  @IsString()
  apiVersion?: string;
}
