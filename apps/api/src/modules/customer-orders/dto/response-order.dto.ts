import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CustomerOrderFeeItemResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: "SHIPPING_SURCHARGE" })
  feeType!: string;

  @ApiProperty({ type: String, example: "Fuel Surcharge" })
  name!: string;

  @ApiProperty({ type: Number, example: 2.5 })
  amount!: number;

  @ApiProperty({ type: String, example: "USD" })
  currency!: string;

  @ApiProperty({ type: String, example: "2026-07-25T12:00:00.000Z" })
  createdAt!: string;
}

export class CustomerOrderProductResponseDto {
  @ApiProperty({ type: Number, example: 101 })
  id!: number;

  @ApiProperty({ type: String, example: "Cotton T-Shirt Black XL" })
  description!: string;

  @ApiProperty({ type: Number, example: 2 })
  quantity!: number;

  @ApiProperty({ type: Number, example: 19.99 })
  value!: number;

  @ApiPropertyOptional({ type: String, example: "6109.10", nullable: true })
  hsCode?: string | null;

  @ApiPropertyOptional({ type: String, example: "VN", nullable: true })
  originCountry?: string | null;

  @ApiPropertyOptional({ type: Number, example: 0.25, nullable: true })
  weight?: number | null;

  @ApiPropertyOptional({ type: String, example: "TSHIRT-BLK-XL", nullable: true })
  sku?: string | null;
}

export class CustomerOrderCheckpointResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: "2026-07-25T14:30:00.000Z" })
  checkpointDate!: string;

  @ApiPropertyOptional({ type: String, example: "Los Angeles, CA", nullable: true })
  location?: string | null;

  @ApiProperty({ type: String, example: "Package arrived at regional sorting facility" })
  description!: string;

  @ApiPropertyOptional({ type: String, example: "USPS", nullable: true })
  carrierCode?: string | null;
}

export class CustomerOrderSummaryResponseDto {
  @ApiProperty({ type: String, example: "ord_123456789" })
  id!: string;

  @ApiProperty({ type: String, example: "EC20260725-001" })
  orderCode!: string;

  @ApiPropertyOptional({ type: String, example: "SELLER-998877", nullable: true })
  sellerOrderId!: string | null;

  @ApiProperty({ type: String, example: "PROCESSING" })
  status!: string;

  @ApiProperty({ type: String, example: "LABEL_CREATED" })
  labelStatus!: string;

  @ApiProperty({ type: String, example: "USPS_FIRST_CLASS" })
  shippingMethod!: string;

  @ApiProperty({ type: String, example: "VN" })
  shippingOrigin!: string;

  @ApiPropertyOptional({ type: String, example: "9400100000000000000000", nullable: true })
  ecomTrackingNumber!: string | null;

  @ApiProperty({ type: String, example: "John Doe" })
  receiverName!: string;

  @ApiPropertyOptional({ type: String, example: "+1234567890", nullable: true })
  receiverPhone!: string | null;

  @ApiProperty({ type: String, example: "Los Angeles" })
  receiverCity!: string;

  @ApiProperty({ type: String, example: "CA" })
  receiverState!: string;

  @ApiProperty({ type: String, example: "US" })
  receiverCountry!: string;

  @ApiProperty({ type: String, example: "90001" })
  receiverZipCode!: string;

  @ApiProperty({ type: String, example: "123 Main Street" })
  receiverAddress1!: string;

  @ApiProperty({ type: Number, example: 0.5 })
  declaredWeight!: number;

  @ApiProperty({ type: Number, example: 8.5 })
  baseShippingFee!: number;

  @ApiProperty({ type: Number, example: 1.2 })
  surchargeFee!: number;

  @ApiProperty({ type: Number, example: 9.7 })
  totalFee!: number;

  @ApiProperty({ type: String, example: "2026-07-25T10:00:00.000Z" })
  createdAt!: string;
}

export class CustomerOrderDetailResponseDto extends CustomerOrderSummaryResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  totalPackets!: number;

  @ApiPropertyOptional({ type: String, example: "CLEARED" })
  exportCustomsStatus?: string;

  @ApiPropertyOptional({ type: String, example: "PENDING" })
  importCustomsStatus?: string;

  @ApiPropertyOptional({ type: String, example: "PAID" })
  paymentStatus?: string;

  @ApiPropertyOptional({ type: String, example: "FlashShip Warehouse", nullable: true })
  senderName!: string | null;

  @ApiPropertyOptional({ type: String, example: "+84900000000", nullable: true })
  senderPhone!: string | null;

  @ApiPropertyOptional({ type: String, example: "warehouse@flashship.com", nullable: true })
  senderEmail!: string | null;

  @ApiPropertyOptional({ type: String, example: "Apt 4B", nullable: true })
  receiverAddress2!: string | null;

  @ApiPropertyOptional({ type: String, example: "john@example.com", nullable: true })
  receiverEmail!: string | null;

  @ApiProperty({ type: () => [CustomerOrderFeeItemResponseDto] })
  feeItems!: CustomerOrderFeeItemResponseDto[];

  @ApiProperty({ type: () => [CustomerOrderProductResponseDto] })
  products!: CustomerOrderProductResponseDto[];

  @ApiProperty({ type: () => [CustomerOrderCheckpointResponseDto] })
  trackingCheckpoints!: CustomerOrderCheckpointResponseDto[];

  @ApiProperty({ type: String, example: "2026-07-25T11:00:00.000Z" })
  updatedAt!: string;
}

export class EstimateFreightResponseDto {
  @ApiProperty({ type: Number, example: 8.5 })
  baseShippingFee!: number;

  @ApiProperty({ type: Number, example: 1.2 })
  surchargeFee!: number;

  @ApiProperty({ type: Number, example: 9.7 })
  totalFee!: number;

  @ApiProperty({ type: Number, example: 0.5 })
  volumeWeight!: number;

  @ApiProperty({ type: Number, example: 0.5 })
  chargeableWeight!: number;
}

export class PaginatedCustomerOrdersResponseDto {
  @ApiProperty({ type: () => [CustomerOrderSummaryResponseDto] })
  data!: CustomerOrderSummaryResponseDto[];

  @ApiProperty({ type: Number, example: 100 })
  total!: number;

  @ApiProperty({ type: Number, example: 1 })
  page!: number;

  @ApiProperty({ type: Number, example: 20 })
  limit!: number;

  @ApiProperty({ type: Number, example: 5 })
  totalPages!: number;
}

export class BulkBatchErrorItemDto {
  @ApiProperty({ type: String, example: "orders[2].declaredWeight" })
  field!: string;

  @ApiProperty({ type: String, example: "Declared weight must be greater than 0" })
  message!: string;

  @ApiProperty({ type: String, example: "INVALID_WEIGHT" })
  code!: string;
}

export class BulkBatchErrorDto {
  @ApiProperty({ type: Number, example: 2 })
  index!: number;

  @ApiProperty({ type: () => [BulkBatchErrorItemDto] })
  errors!: BulkBatchErrorItemDto[];
}

export class BulkOrdersBatchResponseDto {
  @ApiProperty({ type: Number, example: 50 })
  totalProcessed!: number;

  @ApiProperty({ type: Number, example: 48 })
  successCount!: number;

  @ApiProperty({ type: Number, example: 2 })
  failureCount!: number;

  @ApiProperty({ type: () => [CustomerOrderDetailResponseDto] })
  successfulItems!: CustomerOrderDetailResponseDto[];

  @ApiProperty({ type: () => [BulkBatchErrorDto] })
  failedItems!: BulkBatchErrorDto[];
}
