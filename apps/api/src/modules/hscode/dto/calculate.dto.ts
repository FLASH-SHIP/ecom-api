import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CalculateDto {
  @ApiProperty({
    description: "HTS code (e.g. 2203.00.00.60 or 2203000060)",
    example: "2203.00.00.60",
  })
  @IsNotEmpty()
  @IsString()
  code!: string;

  @ApiProperty({
    description: "Shipment value in USD",
    example: 10000,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value!: number;

  @ApiProperty({
    description: "Mode of transport (e.g. Ocean, Air)",
    example: "Ocean",
  })
  @IsNotEmpty()
  @IsString()
  mode!: string;

  @ApiPropertyOptional({
    description: "Country of origin",
    example: "Vietnam",
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: "Entry date",
    example: "06/18/2026",
  })
  @IsOptional()
  @IsString()
  entryDate?: string;

  @ApiPropertyOptional({
    description: "Date of loading",
    example: "06/18/2026",
  })
  @IsOptional()
  @IsString()
  loadingDate?: string;
}
