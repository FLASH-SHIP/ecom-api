import { SystemDiagnosticsService } from "@ecom/features/system/services/SystemDiagnosticsService";
import { prisma } from "@ecom/prisma";

let _systemDiagnosticsService: SystemDiagnosticsService | null = null;

export function getSystemDiagnosticsService(): SystemDiagnosticsService {
  if (!_systemDiagnosticsService) {
    _systemDiagnosticsService = new SystemDiagnosticsService({
      prisma,
    });
  }
  return _systemDiagnosticsService;
}

export function resetSystemDiagnosticsContainer(): void {
  _systemDiagnosticsService = null;
}
