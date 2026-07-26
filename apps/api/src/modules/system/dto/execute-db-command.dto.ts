import type { MaintenanceAction } from "@ecom/features/system/services/DatabaseMaintenanceService";
import { IsEnum, IsOptional, IsString, Matches } from "class-validator";

export class ExecuteDatabaseCommandDto {
  @IsEnum([
    "migrate-deploy",
    "migrate-reset",
    "migrate-status",
    "db-push",
    "validate",
    "generate",
    "seed",
  ])
  action!: MaintenanceAction;

  @IsString()
  sudoPassword!: string;

  @IsString()
  maintenanceKey!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: "seedOnly must contain only alphanumeric characters, dashes, or underscores",
  })
  seedOnly?: string;

  @IsOptional()
  @IsString()
  @IsEnum(["core", "business", "all"])
  seedCategory?: string;
}
