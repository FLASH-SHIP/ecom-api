import { ShippingMethod } from "@ecom/prisma";
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
  @IsString()
  description!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsString()
  hsCode?: string | null;

  @IsOptional()
  @IsString()
  originCountry?: string | null;

  @IsOptional()
  @IsNumber()
  weight?: number | null;

  @IsOptional()
  @IsString()
  sku?: string | null;
}

export class CreateOrderDto {
  @IsEnum(ShippingMethod)
  shippingMethod!: ShippingMethod;

  @IsOptional()
  @IsString()
  shippingOrigin?: string;

  @IsOptional()
  @IsString()
  sellerOrderId?: string | null;

  // Sender Info
  @IsOptional()
  @IsString()
  senderName?: string | null;

  @IsOptional()
  @IsString()
  senderAddress?: string | null;

  @IsOptional()
  @IsString()
  senderPhone?: string | null;

  @IsOptional()
  @IsString()
  senderEmail?: string | null;

  @IsOptional()
  @IsString()
  senderCountry?: string | null;

  @IsOptional()
  @IsString()
  senderState?: string | null;

  @IsOptional()
  @IsString()
  senderCity?: string | null;

  @IsOptional()
  @IsString()
  senderZipCode?: string | null;

  // Receiver Info
  @IsString()
  receiverName!: string;

  @IsOptional()
  @IsString()
  receiverPhone?: string | null;

  @IsOptional()
  @IsString()
  receiverEmail?: string | null;

  @IsString()
  receiverCity!: string;

  @IsString()
  receiverState!: string;

  @IsString()
  receiverAddress1!: string;

  @IsOptional()
  @IsString()
  receiverAddress2?: string | null;

  @IsString()
  receiverCountry!: string;

  @IsString()
  receiverZipCode!: string;

  // Cargo Info
  @IsString()
  detailDescription!: string;

  @IsInt()
  @Min(1)
  declaredWeight!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  dimensionLength?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  dimensionWidth?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  dimensionHeight?: number | null;

  @IsNumber()
  @Min(0)
  declaredValue!: number;

  @IsOptional()
  @IsString()
  packagingCode?: string | null;

  @IsOptional()
  @IsInt()
  isGetLabel?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  products?: OrderProductDto[];
}

export class CreateBulkOrdersDto {
  @ValidateNested({ each: true })
  @Type(() => CreateOrderDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  orders!: CreateOrderDto[];
}
