import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";

export class ExecuteLogCommandDto {
  @IsEnum(["list", "read", "stream"])
  action!: "list" | "read" | "stream";

  @IsOptional()
  @IsString()
  @Matches(/^app-\d{4}-\d{2}-\d{2}\.log$/, {
    message: "filename must match pattern app-YYYY-MM-DD.log",
  })
  filename?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  lines?: number = 100;

  @IsOptional()
  @IsEnum(["debug", "info", "warn", "error"])
  level?: "debug" | "info" | "warn" | "error";

  @IsOptional()
  @IsString()
  search?: string;

  @IsString()
  sudoPassword!: string;

  @IsString()
  maintenanceKey!: string;
}
