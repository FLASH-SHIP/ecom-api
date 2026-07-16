import { IsEnum, IsOptional, IsString, Matches } from "class-validator";

export class QueryRedisDto {
  @IsEnum(["scan", "get", "del"])
  action!: "scan" | "get" | "del";

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9:*_-]+$/, {
    message: "pattern must contain only alphanumeric characters, colons, stars, dashes, or underscores",
  })
  pattern?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9:*_-]+$/, {
    message: "key must contain only alphanumeric characters, colons, dashes, or underscores",
  })
  key?: string;

  @IsString()
  sudoPassword!: string;

  @IsString()
  maintenanceKey!: string;
}
