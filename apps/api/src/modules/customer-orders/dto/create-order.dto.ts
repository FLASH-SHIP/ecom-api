import { ShippingMethod, ShippingOrigin } from "@ecom/prisma";
import {
  getPostalCodeRuleInfo,
  isNoZipcodeCountry,
  validatePostalCode,
} from "@flash-ship/ecom-lib";
import {
  GET_LABEL_OPTION,
  HS_CODE_REGEX,
  isAllowedSenderCountry,
  MAX_DECLARED_VALUE_USD,
  MAX_DECLARED_WEIGHT_GRAMS,
  MAX_DIMENSION_CM,
  PARCEL_VALIDATION_MESSAGES,
  PHONE_REGEX,
  PHONE_VALIDATION_MESSAGES,
  SENDER_COUNTRY_VALIDATION_MESSAGE,
} from "@flash-ship/ecom-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "isAllowedSenderCountry", async: false })
export class IsAllowedSenderCountryConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (value === undefined || value === null || value === "") return true;
    return typeof value === "string" && isAllowedSenderCountry(value);
  }

  defaultMessage() {
    return SENDER_COUNTRY_VALIDATION_MESSAGE;
  }
}

@ValidatorConstraint({ name: "isPostalCodeValid", async: false })
export class IsPostalCodeValidConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments) {
    const obj = args.object as { receiverCountry?: string; senderCountry?: string };
    const country = obj.receiverCountry || obj.senderCountry;
    return validatePostalCode(country, typeof value === "string" ? value : String(value || ""));
  }

  defaultMessage(args: ValidationArguments) {
    const obj = args.object as { receiverCountry?: string; senderCountry?: string };
    const country = obj.receiverCountry || obj.senderCountry;
    const ruleInfo = getPostalCodeRuleInfo(country);
    if (!ruleInfo || ruleInfo.isOptional) {
      return "Mã bưu chính không hợp lệ";
    }
    return `Mã bưu chính người nhận (receiverZipCode) không đúng định dạng cho quốc gia ${country || ""}. ${ruleInfo.description}`;
  }
}

export class OrderProductDto {
  @ApiProperty({
    type: () => String,
    description: "Product description",
    example: "Cotton T-Shirt Black XL",
  })
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Tên sản phẩm (description) không được để trống",
  })
  @MaxLength(200, {
    always: true,
    message: "Tên sản phẩm (description) không được vượt quá 200 ký tự",
  })
  description!: string;

  @ApiProperty({ type: () => Number, description: "Item quantity", example: 2, minimum: 1 })
  @IsInt({ always: true, message: "Số lượng sản phẩm (quantity) phải là số nguyên dương" })
  @Min(1, { always: true, message: "Số lượng sản phẩm (quantity) phải là số nguyên dương" })
  quantity!: number;

  @ApiProperty({
    type: () => Number,
    description: "Item declared unit value (USD)",
    example: 19.99,
    minimum: 0.01,
  })
  @IsNotEmpty({
    always: true,
    message: "Giá trị sản phẩm (value) không được để trống",
  })
  @IsNumber({}, { always: true, message: "Giá trị sản phẩm (value) phải là số" })
  @Min(0.01, { always: true, message: "Giá trị sản phẩm (value) phải lớn hơn 0" })
  @Max(MAX_DECLARED_VALUE_USD, {
    always: true,
    message: PARCEL_VALIDATION_MESSAGES.VALUE_MAX,
  })
  value!: number;

  @ApiProperty({
    type: () => String,
    description: "Harmonized System tariff code (6-10 digits)",
    example: "610910",
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === "string") {
      return value.replace(/\./g, "").trim();
    }
    if (typeof value === "number") {
      return String(value).trim();
    }
    return value;
  })
  @IsNotEmpty({
    always: true,
    message: PARCEL_VALIDATION_MESSAGES.HS_CODE_REQUIRED,
  })
  @IsString({ always: true })
  @Matches(HS_CODE_REGEX, {
    always: true,
    message: PARCEL_VALIDATION_MESSAGES.HS_CODE_FORMAT_INVALID,
  })
  hsCode!: string;

  @ApiProperty({
    type: () => String,
    description: "Country of origin 2-letter code",
    example: "VN",
  })
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Xuất xứ sản phẩm (originCountry) không được để trống",
  })
  originCountry!: string;

  @ApiPropertyOptional({
    type: () => Number,
    description: "Single item weight in grams",
    example: 250,
    nullable: true,
  })
  @IsOptional({ always: true })
  @IsNumber({}, { always: true })
  weight?: number | null;

  @ApiPropertyOptional({
    type: () => String,
    description: "Seller SKU identifier",
    example: "TSHIRT-BLK-XL",
    nullable: true,
  })
  @IsOptional({ always: true })
  @IsString({ always: true })
  sku?: string | null;
}

export class CreateOrderDto {
  @ApiProperty({
    enum: ShippingMethod,
    example: "USPS_FIRST_CLASS",
    description: "Shipping method code",
  })
  @IsEnum(ShippingMethod, {
    always: true,
    message:
      'Phương thức vận chuyển (shippingMethod) không hợp lệ, chỉ chấp nhận "EXPRESS" hoặc "EPACKET"',
  })
  shippingMethod!: ShippingMethod;

  @ApiProperty({
    enum: ShippingOrigin,
    example: "HAN",
    description: "Dispatch origin warehouse location",
  })
  @IsEnum(ShippingOrigin, {
    always: true,
    message: 'Mã kho xuất hàng (shippingOrigin) không hợp lệ, chỉ chấp nhận "HAN" hoặc "SGN"',
  })
  shippingOrigin!: ShippingOrigin;

  @ApiProperty({
    type: () => String,
    example: "SELLER-ORDER-9988",
    description: "Seller internal order ID",
  })
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Mã đơn hàng người bán (sellerOrderId) không được để trống",
  })
  sellerOrderId!: string;

  @ApiPropertyOptional({
    type: () => Number,
    example: 1,
    default: 1,
    description: "Total number of physical packets",
  })
  @IsOptional({ always: true })
  @IsInt({ always: true })
  @Min(1, { always: true })
  totalPackets?: number;

  // Sender Info
  @ApiProperty({
    type: () => String,
    example: "FlashShip Warehouse",
    description: "Sender company or full name",
  })
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Tên người gửi (senderName) không được để trống",
  })
  senderName!: string;

  @ApiProperty({
    type: () => String,
    example: "123 Logistics Way",
    description: "Sender street address",
  })
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Địa chỉ người gửi (senderAddress) không được để trống",
  })
  senderAddress!: string;

  @ApiProperty({
    type: () => String,
    example: "+84900000000",
    description: "Sender contact phone number",
  })
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Số điện thoại người gửi (senderPhone) không được để trống",
  })
  @Matches(PHONE_REGEX, {
    always: true,
    message: PHONE_VALIDATION_MESSAGES.SENDER,
  })
  senderPhone!: string;

  @ApiPropertyOptional({
    type: () => String,
    example: "warehouse@flashship.com",
    description: "Sender email address",
    nullable: true,
  })
  @IsOptional({ always: true })
  @IsString({ always: true })
  @IsEmail({}, { always: true, message: PARCEL_VALIDATION_MESSAGES.EMAIL_SENDER_INVALID })
  senderEmail?: string | null;

  @ApiProperty({
    type: () => String,
    example: "VN",
    description: "Sender country 2-letter code (currently only 'VN' is supported)",
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toUpperCase().trim() : value,
  )
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Quốc gia người gửi (senderCountry) không được để trống",
  })
  @Validate(IsAllowedSenderCountryConstraint, { always: true })
  senderCountry!: string;

  @ApiPropertyOptional({
    type: () => String,
    example: "Hanoi",
    description: "Sender state/province",
    nullable: true,
  })
  @IsOptional({ always: true })
  @IsString({ always: true })
  senderState?: string | null;

  @ApiProperty({
    type: () => String,
    example: "Hanoi",
    description: "Sender city",
  })
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Thành phố người gửi (senderCity) không được để trống",
  })
  senderCity!: string;

  @ApiProperty({
    type: () => String,
    example: "Cầu Giấy",
    description: "Sender ward/district",
  })
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Phường/Xã người gửi (senderWard) không được để trống",
  })
  senderWard!: string;

  @ApiProperty({
    type: () => String,
    example: "100000",
    description: "Sender postal/zip code",
  })
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Mã bưu chính người gửi (senderZipCode) không được để trống",
  })
  senderZipCode!: string;

  // Receiver Info
  @ApiProperty({ type: () => String, example: "John Doe", description: "Receiver full name" })
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Tên người nhận (receiverName) không được để trống",
  })
  receiverName!: string;

  @ApiPropertyOptional({
    type: () => String,
    example: "+12135550123",
    description: "Receiver contact phone number",
    nullable: true,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" && value.trim() === "" ? null : value,
  )
  @IsOptional({ always: true })
  @IsString({ always: true })
  @Matches(PHONE_REGEX, {
    always: true,
    message: PHONE_VALIDATION_MESSAGES.RECEIVER,
  })
  receiverPhone?: string | null;

  @ApiPropertyOptional({
    type: () => String,
    example: "john.doe@example.com",
    description: "Receiver email address",
    nullable: true,
  })
  @IsOptional({ always: true })
  @IsString({ always: true })
  @IsEmail({}, { always: true, message: PARCEL_VALIDATION_MESSAGES.EMAIL_RECEIVER_INVALID })
  receiverEmail?: string | null;

  @ApiProperty({ type: () => String, example: "Los Angeles", description: "Receiver city" })
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Thành phố người nhận (receiverCity) không được để trống",
  })
  receiverCity!: string;

  @ApiProperty({
    type: () => String,
    example: "CA",
    description: "Receiver state/province 2-letter code",
  })
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Bang/Tỉnh người nhận (receiverState) không được để trống",
  })
  receiverState!: string;

  @ApiProperty({
    type: () => String,
    example: "456 Market Street",
    description: "Receiver primary street address",
  })
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Địa chỉ người nhận 1 (receiverAddress1) không được để trống",
  })
  receiverAddress1!: string;

  @ApiPropertyOptional({
    type: () => String,
    example: "Suite 300",
    description: "Receiver apartment/suite number",
    nullable: true,
  })
  @IsOptional({ always: true })
  @IsString({ always: true })
  receiverAddress2?: string | null;

  @ApiProperty({
    type: () => String,
    example: "US",
    description: "Receiver destination country 2-letter ISO code",
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toUpperCase().trim() : value,
  )
  @IsString({ always: true })
  @IsNotEmpty({
    always: true,
    message: "Quốc gia người nhận (receiverCountry) không được để trống",
  })
  receiverCountry!: string;

  @ApiProperty({ type: () => String, example: "90001", description: "Receiver postal/zip code" })
  @IsString({ always: true })
  @ValidateIf((o: CreateOrderDto) => !isNoZipcodeCountry(o.receiverCountry))
  @IsNotEmpty({
    always: true,
    message: "Mã bưu chính người nhận (receiverZipCode) không được để trống",
  })
  @Validate(IsPostalCodeValidConstraint, { always: true })
  receiverZipCode!: string;

  // Cargo Info
  @ApiPropertyOptional({
    type: () => String,
    example: "Apparel, Cotton T-Shirts",
    description:
      "Detailed manifest cargo description (optional, max 200 chars, auto-generated from products if missing)",
    nullable: true,
  })
  @IsOptional({ always: true })
  @IsString({ always: true })
  @MaxLength(200, {
    always: true,
    message: "Mô tả chi tiết hàng hóa (detailDescription) không được vượt quá 200 ký tự",
  })
  detailDescription?: string | null;

  @ApiProperty({
    type: () => Number,
    example: 500,
    minimum: 1,
    description: "Declared total gross weight in grams",
  })
  @IsInt({ always: true, message: "Trọng lượng khai báo (declaredWeight) phải là số nguyên dương" })
  @Min(1, {
    always: true,
    message: "Trọng lượng khai báo (declaredWeight) phải là số nguyên dương",
  })
  @Max(MAX_DECLARED_WEIGHT_GRAMS, {
    always: true,
    message: PARCEL_VALIDATION_MESSAGES.WEIGHT_MAX,
  })
  declaredWeight!: number;

  @ApiProperty({
    type: () => Number,
    example: 20,
    minimum: 1,
    description: "Package length in cm",
  })
  @IsNumber({}, { always: true, message: "Chiều dài (dimensionLength) phải là số dương" })
  @IsPositive({ always: true, message: "Chiều dài (dimensionLength) phải là số dương" })
  @Max(MAX_DIMENSION_CM, {
    always: true,
    message: PARCEL_VALIDATION_MESSAGES.LENGTH_MAX,
  })
  dimensionLength!: number;

  @ApiProperty({
    type: () => Number,
    example: 15,
    minimum: 1,
    description: "Package width in cm",
  })
  @IsNumber({}, { always: true, message: "Chiều rộng (dimensionWidth) phải là số dương" })
  @IsPositive({ always: true, message: "Chiều rộng (dimensionWidth) phải là số dương" })
  @Max(MAX_DIMENSION_CM, {
    always: true,
    message: PARCEL_VALIDATION_MESSAGES.WIDTH_MAX,
  })
  dimensionWidth!: number;

  @ApiProperty({
    type: () => Number,
    example: 5,
    minimum: 1,
    description: "Package height in cm",
  })
  @IsNumber({}, { always: true, message: "Chiều cao (dimensionHeight) phải là số dương" })
  @IsPositive({ always: true, message: "Chiều cao (dimensionHeight) phải là số dương" })
  @Max(MAX_DIMENSION_CM, {
    always: true,
    message: PARCEL_VALIDATION_MESSAGES.HEIGHT_MAX,
  })
  dimensionHeight!: number;

  @ApiPropertyOptional({
    type: () => Number,
    example: 39.98,
    minimum: 0,
    description:
      "Total declared customs value in USD (optional, auto-calculated from products if missing)",
    nullable: true,
  })
  @IsOptional({ always: true })
  @IsNumber({}, { always: true, message: "Giá trị khai báo (declaredValue) phải là số" })
  @Min(0, { always: true, message: "Giá trị khai báo (declaredValue) phải lớn hơn hoặc bằng 0" })
  @Max(MAX_DECLARED_VALUE_USD, {
    always: true,
    message: PARCEL_VALIDATION_MESSAGES.DECLARED_VALUE_MAX,
  })
  declaredValue?: number | null;

  @ApiPropertyOptional({
    type: () => Number,
    example: 1,
    description: "Packaging type numeric ID",
    nullable: true,
  })
  @IsOptional({ always: true })
  @IsInt({ always: true })
  packingTypeId?: number | null;

  @ApiPropertyOptional({
    type: () => String,
    example: "FLYER_BAG",
    description: "Packaging code identifier",
    nullable: true,
  })
  @IsOptional({ always: true })
  @IsString({ always: true })
  packagingCode?: string | null;

  @ApiPropertyOptional({
    enum: GET_LABEL_OPTION,
    example: GET_LABEL_OPTION.GET_LABEL_NOW,
    description:
      "Option mode for shipping label creation (1 = GET_LABEL_NOW / auto purchase label immediately, 0 = GET_LABEL_LATER / leave in pending label status)",
  })
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null) return GET_LABEL_OPTION.GET_LABEL_LATER;
    if (value === true || value === 1 || value === "1") return GET_LABEL_OPTION.GET_LABEL_NOW;
    return GET_LABEL_OPTION.GET_LABEL_LATER;
  })
  @IsOptional({ always: true })
  @IsInt({ always: true })
  isGetLabel?: number;

  @ApiPropertyOptional({
    type: () => [OrderProductDto],
    description: "List of itemized products in order",
  })
  @IsOptional({ always: true })
  @ValidateNested({ each: true, always: true })
  @Type(() => OrderProductDto)
  products?: OrderProductDto[];
}

export const MAX_BULK_ORDER_LIMIT = 50;

export class CreateBulkOrdersDto {
  @ApiProperty({
    type: () => [CreateOrderDto],
    description: "Array of order creation payloads (1-50 orders per request)",
  })
  @ValidateNested({ each: true, always: true })
  @Type(() => CreateOrderDto)
  @ArrayMinSize(1, { always: true })
  @ArrayMaxSize(MAX_BULK_ORDER_LIMIT, { always: true })
  orders!: CreateOrderDto[];
}

export class EstimateFreightDto {
  @ApiProperty({
    enum: ShippingMethod,
    example: "USPS_FIRST_CLASS",
    description: "Shipping method code",
  })
  @IsEnum(ShippingMethod, {
    always: true,
    message:
      'Phương thức vận chuyển (shippingMethod) không hợp lệ, chỉ chấp nhận "EXPRESS" hoặc "EPACKET"',
  })
  shippingMethod!: ShippingMethod;

  @ApiPropertyOptional({
    enum: ShippingOrigin,
    example: "VN",
    description: "Dispatch origin warehouse location",
  })
  @IsOptional({ always: true })
  @IsEnum(ShippingOrigin, {
    always: true,
    message: 'Mã kho xuất hàng (shippingOrigin) không hợp lệ, chỉ chấp nhận "HAN" hoặc "SGN"',
  })
  shippingOrigin?: ShippingOrigin;

  @ApiProperty({
    type: () => String,
    example: "US",
    description: "Receiver destination country 2-letter ISO code",
  })
  @IsString({ always: true })
  receiverCountry!: string;

  @ApiProperty({
    type: () => Number,
    example: 500,
    minimum: 1,
    description: "Declared total gross weight in grams",
  })
  @IsInt({ always: true })
  @Min(1, { always: true })
  declaredWeight!: number;

  @ApiPropertyOptional({
    type: () => Number,
    example: 20,
    minimum: 1,
    description: "Package length in cm",
    nullable: true,
  })
  @IsOptional({ always: true })
  @IsInt({ always: true })
  @Min(1, { always: true })
  dimensionLength?: number | null;

  @ApiPropertyOptional({
    type: () => Number,
    example: 15,
    minimum: 1,
    description: "Package width in cm",
    nullable: true,
  })
  @IsOptional({ always: true })
  @IsInt({ always: true })
  @Min(1, { always: true })
  dimensionWidth?: number | null;

  @ApiPropertyOptional({
    type: () => Number,
    example: 5,
    minimum: 1,
    description: "Package height in cm",
    nullable: true,
  })
  @IsOptional({ always: true })
  @IsInt({ always: true })
  @Min(1, { always: true })
  dimensionHeight?: number | null;
}
