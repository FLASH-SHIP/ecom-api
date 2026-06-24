import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListSubmissionsQueryDto {
  @IsOptional()
  @IsString()
  formSlug?: string;

  @IsOptional()
  @IsEnum(["new", "read", "replied", "archived"])
  status?: "new" | "read" | "replied" | "archived";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage = 20;
}
