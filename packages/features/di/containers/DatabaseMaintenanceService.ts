import { DatabaseMaintenanceService } from "@ecom/features/system/services/DatabaseMaintenanceService";
import { prisma } from "@ecom/prisma";

let _databaseMaintenanceService: DatabaseMaintenanceService | null = null;

export function getDatabaseMaintenanceService(): DatabaseMaintenanceService {
  if (!_databaseMaintenanceService) {
    _databaseMaintenanceService = new DatabaseMaintenanceService({
      prisma,
    });
  }
  return _databaseMaintenanceService;
}

export function resetDatabaseMaintenanceContainer(): void {
  _databaseMaintenanceService = null;
}
