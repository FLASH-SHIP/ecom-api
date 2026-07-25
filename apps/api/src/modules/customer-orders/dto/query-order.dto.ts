import { OrderStatus } from "@ecom/prisma";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class GetCustomerOrdersDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: "Filter by Ecom Order Code" })
  @IsOptional()
  @IsString()
  orderCode?: string;

  @ApiPropertyOptional({ description: "Filter by Customer Seller Order ID" })
  @IsOptional()
  @IsString()
  sellerOrderId?: string;

  @ApiPropertyOptional({
    description: "Search keyword matching orderCode, trackingNumber, sellerOrderId, receiverName",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Start date filter (ISO String)" })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  fromDate?: Date;

  @ApiPropertyOptional({ description: "End date filter (ISO String)" })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  toDate?: Date;
}

export class CancelOrderDto {
  @ApiPropertyOptional({ description: "Reason for cancellation", type: String })
  @IsOptional()
  @IsString()
  reason?: string;
}
