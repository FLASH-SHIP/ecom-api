import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class AdminAddressInfoDto {
  @ApiProperty({ example: "Sender Test" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: "2133730000" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "sender@example.com" })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: "Sender Test" })
  @IsOptional()
  @IsString()
  attentionName?: string;

  @ApiProperty({ example: "10725 Springdale Ave" })
  @IsString()
  @IsNotEmpty()
  addressLine1!: string;

  @ApiPropertyOptional({ example: "STE 2" })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({ example: "Santa Fe Springs" })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: "CA" })
  @IsString()
  @IsNotEmpty()
  stateProvinceCode!: string;

  @ApiProperty({ example: "90670" })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @ApiProperty({ example: "US" })
  @IsString()
  @IsNotEmpty()
  countryCode!: string;
}

export class AdminPackageWeightDto {
  @ApiProperty({ example: 1.5 })
  @IsNumber()
  weight!: number;

  @ApiProperty({ example: "LBS", enum: ["LBS", "KGS", "OZS"] })
  @IsEnum(["LBS", "KGS", "OZS"])
  unitOfMeasurement!: "LBS" | "KGS" | "OZS";
}

export class AdminPackageDimensionsDto {
  @ApiProperty({ example: 10 })
  @IsNumber()
  length!: number;

  @ApiProperty({ example: 8 })
  @IsNumber()
  width!: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  height!: number;

  @ApiProperty({ example: "IN", enum: ["IN", "CM"] })
  @IsEnum(["IN", "CM"])
  unitOfMeasurement!: "IN" | "CM";
}

export class AdminPackageSpecDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  numberLabels?: number;

  @ApiProperty({ type: () => AdminPackageWeightDto })
  @ValidateNested()
  @Type(() => AdminPackageWeightDto)
  weight!: AdminPackageWeightDto;

  @ApiProperty({ type: () => AdminPackageDimensionsDto })
  @ValidateNested()
  @Type(() => AdminPackageDimensionsDto)
  dimensions!: AdminPackageDimensionsDto;
}

export class AdminPriceInquiryDto {
  @ApiProperty({ example: "req_price_inquiry_001" })
  @IsString()
  @IsNotEmpty()
  requestId!: string;

  @ApiPropertyOptional({ example: "03" })
  @IsOptional()
  @IsString()
  serviceCode?: string | null;

  @ApiProperty({ type: () => AdminAddressInfoDto })
  @ValidateNested()
  @Type(() => AdminAddressInfoDto)
  shipFrom!: AdminAddressInfoDto;

  @ApiProperty({ type: () => AdminAddressInfoDto })
  @ValidateNested()
  @Type(() => AdminAddressInfoDto)
  shipTo!: AdminAddressInfoDto;

  @ApiProperty({ type: () => [AdminPackageSpecDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminPackageSpecDto)
  packages!: AdminPackageSpecDto[];
}

export class AdminPrintLabelDto {
  @ApiPropertyOptional({ example: "1ZX1234567890" })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: "req_price_inquiry_001" })
  @IsOptional()
  @IsString()
  requestId?: string;
}

export class AdminVoidLabelDto {
  @ApiProperty({ example: "1ZX1234567890" })
  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;
}
