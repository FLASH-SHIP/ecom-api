import { ShippingMethod, ShippingOrigin } from "@ecom/prisma";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class OrderProductDto {
  @ApiProperty({
    type: () => String,
    description: "Product description",
    example: "Cotton T-Shirt Black XL",
  })
  @IsString()
  description!: string;

  @ApiProperty({ type: () => Number, description: "Item quantity", example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    type: () => Number,
    description: "Item declared unit value (USD)",
    example: 19.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiPropertyOptional({
    type: () => String,
    description: "Harmonized System tariff code",
    example: "6109.10",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  hsCode?: string | null;

  @ApiPropertyOptional({
    type: () => String,
    description: "Country of origin 2-letter code",
    example: "VN",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  originCountry?: string | null;

  @ApiPropertyOptional({
    type: () => Number,
    description: "Single item weight in grams",
    example: 250,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  weight?: number | null;

  @ApiPropertyOptional({
    type: () => String,
    description: "Seller SKU identifier",
    example: "TSHIRT-BLK-XL",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  sku?: string | null;
}

export class CreateOrderDto {
  @ApiProperty({
    enum: ShippingMethod,
    example: "USPS_FIRST_CLASS",
    description: "Shipping method code",
  })
  @IsEnum(ShippingMethod)
  shippingMethod!: ShippingMethod;

  @ApiPropertyOptional({
    enum: ShippingOrigin,
    example: "VN",
    description: "Dispatch origin warehouse location",
  })
  @IsOptional()
  @IsEnum(ShippingOrigin)
  shippingOrigin?: ShippingOrigin;

  @ApiPropertyOptional({
    type: () => String,
    example: "SELLER-ORDER-9988",
    description: "Seller internal order ID",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  sellerOrderId?: string | null;

  @ApiPropertyOptional({
    type: () => Number,
    example: 1,
    default: 1,
    description: "Total number of physical packets",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalPackets?: number;

  // Sender Info
  @ApiPropertyOptional({
    type: () => String,
    example: "FlashShip Warehouse",
    description: "Sender company or full name",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  senderName?: string | null;

  @ApiPropertyOptional({
    type: () => String,
    example: "123 Logistics Way",
    description: "Sender street address",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  senderAddress?: string | null;

  @ApiPropertyOptional({
    type: () => String,
    example: "+84900000000",
    description: "Sender contact phone number",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  senderPhone?: string | null;

  @ApiPropertyOptional({
    type: () => String,
    example: "warehouse@flashship.com",
    description: "Sender email address",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  senderEmail?: string | null;

  @ApiPropertyOptional({
    type: () => String,
    example: "VN",
    description: "Sender country 2-letter code",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  senderCountry?: string | null;

  @ApiPropertyOptional({
    type: () => String,
    example: "Hanoi",
    description: "Sender state/province",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  senderState?: string | null;

  @ApiPropertyOptional({
    type: () => String,
    example: "Hanoi",
    description: "Sender city",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  senderCity?: string | null;

  @ApiPropertyOptional({
    type: () => String,
    example: "Cầu Giấy",
    description: "Sender ward/district",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  senderWard?: string | null;

  @ApiPropertyOptional({
    type: () => String,
    example: "100000",
    description: "Sender postal/zip code",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  senderZipCode?: string | null;

  // Receiver Info
  @ApiProperty({ type: () => String, example: "John Doe", description: "Receiver full name" })
  @IsString()
  receiverName!: string;

  @ApiPropertyOptional({
    type: () => String,
    example: "+12135550123",
    description: "Receiver contact phone number",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  receiverPhone?: string | null;

  @ApiPropertyOptional({
    type: () => String,
    example: "john.doe@example.com",
    description: "Receiver email address",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  receiverEmail?: string | null;

  @ApiProperty({ type: () => String, example: "Los Angeles", description: "Receiver city" })
  @IsString()
  receiverCity!: string;

  @ApiProperty({
    type: () => String,
    example: "CA",
    description: "Receiver state/province 2-letter code",
  })
  @IsString()
  receiverState!: string;

  @ApiProperty({
    type: () => String,
    example: "456 Market Street",
    description: "Receiver primary street address",
  })
  @IsString()
  receiverAddress1!: string;

  @ApiPropertyOptional({
    type: () => String,
    example: "Suite 300",
    description: "Receiver apartment/suite number",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  receiverAddress2?: string | null;

  @ApiProperty({
    type: () => String,
    example: "US",
    description: "Receiver destination country 2-letter ISO code",
  })
  @IsString()
  receiverCountry!: string;

  @ApiProperty({ type: () => String, example: "90001", description: "Receiver postal/zip code" })
  @IsString()
  receiverZipCode!: string;

  // Cargo Info
  @ApiProperty({
    type: () => String,
    example: "Apparel, Cotton T-Shirts",
    description: "Detailed manifest cargo description",
  })
  @IsString()
  detailDescription!: string;

  @ApiProperty({
    type: () => Number,
    example: 500,
    minimum: 1,
    description: "Declared total gross weight in grams",
  })
  @IsInt()
  @Min(1)
  declaredWeight!: number;

  @ApiPropertyOptional({
    type: () => Number,
    example: 20,
    minimum: 1,
    description: "Package length in cm",
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  dimensionLength?: number | null;

  @ApiPropertyOptional({
    type: () => Number,
    example: 15,
    minimum: 1,
    description: "Package width in cm",
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  dimensionWidth?: number | null;

  @ApiPropertyOptional({
    type: () => Number,
    example: 5,
    minimum: 1,
    description: "Package height in cm",
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  dimensionHeight?: number | null;

  @ApiProperty({
    type: () => Number,
    example: 39.98,
    minimum: 0,
    description: "Total declared customs value in USD",
  })
  @IsNumber()
  @Min(0)
  declaredValue!: number;

  @ApiPropertyOptional({
    type: () => Number,
    example: 1,
    description: "Packaging type numeric ID",
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  packingTypeId?: number | null;

  @ApiPropertyOptional({
    type: () => String,
    example: "FLYER_BAG",
    description: "Packaging code identifier",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  packagingCode?: string | null;

  @ApiPropertyOptional({
    type: () => Number,
    example: 1,
    description: "Auto-generate carrier shipping label flag (1=yes, 0=no)",
  })
  @IsOptional()
  @IsInt()
  isGetLabel?: number;

  @ApiPropertyOptional({
    type: () => [OrderProductDto],
    description: "List of itemized products in order",
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  products?: OrderProductDto[];
}

export const MAX_BULK_ORDER_LIMIT = 50;

export class CreateBulkOrdersDto {
  @ApiProperty({
    type: () => [CreateOrderDto],
    description: "Array of order creation payloads (1-50 orders per request)",
  })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_ORDER_LIMIT)
  orders!: CreateOrderDto[];
}

export class EstimateFreightDto {
  @ApiProperty({
    enum: ShippingMethod,
    example: "USPS_FIRST_CLASS",
    description: "Shipping method code",
  })
  @IsEnum(ShippingMethod)
  shippingMethod!: ShippingMethod;

  @ApiPropertyOptional({
    enum: ShippingOrigin,
    example: "VN",
    description: "Dispatch origin warehouse location",
  })
  @IsOptional()
  @IsEnum(ShippingOrigin)
  shippingOrigin?: ShippingOrigin;

  @ApiProperty({
    type: () => String,
    example: "US",
    description: "Receiver destination country 2-letter ISO code",
  })
  @IsString()
  receiverCountry!: string;

  @ApiProperty({
    type: () => Number,
    example: 500,
    minimum: 1,
    description: "Declared total gross weight in grams",
  })
  @IsInt()
  @Min(1)
  declaredWeight!: number;

  @ApiPropertyOptional({
    type: () => Number,
    example: 20,
    minimum: 1,
    description: "Package length in cm",
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  dimensionLength?: number | null;

  @ApiPropertyOptional({
    type: () => Number,
    example: 15,
    minimum: 1,
    description: "Package width in cm",
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  dimensionWidth?: number | null;

  @ApiPropertyOptional({
    type: () => Number,
    example: 5,
    minimum: 1,
    description: "Package height in cm",
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  dimensionHeight?: number | null;
}
