import { ApiProperty } from "@nestjs/swagger";

export class CustomerWebhookDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: "Order Updates Webhook" })
  name!: string;

  @ApiProperty({ type: String, example: "whsec_a1b2c3d4e5f67890" })
  secret!: string;

  @ApiProperty({ type: String, example: "https://example.com/webhooks/orders" })
  url!: string;

  @ApiProperty({ type: [String], example: ["order.created", "order.updated"] })
  events!: string[];
}

export class CustomerWebhookResponseDto extends CustomerWebhookDto {}

export class CustomerWebhookListResponseDto {
  @ApiProperty({ type: () => [CustomerWebhookDto] })
  data!: CustomerWebhookDto[];
}
