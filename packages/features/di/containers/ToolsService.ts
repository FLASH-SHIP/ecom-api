import { BulkActionService } from "@ecom/features/tools/services/BulkActionService";
import { ExportService } from "@ecom/features/tools/services/ExportService";
import { ImportService } from "@ecom/features/tools/services/ImportService";
import { prisma } from "@ecom/prisma";

let _exportService: ExportService | null = null;
let _importService: ImportService | null = null;
let _bulkActionService: BulkActionService | null = null;

export function getExportService(): ExportService {
  if (!_exportService) {
    _exportService = new ExportService(prisma);
  }
  return _exportService;
}

export function getImportService(): ImportService {
  if (!_importService) {
    _importService = new ImportService(prisma);
  }
  return _importService;
}

export function getBulkActionService(): BulkActionService {
  if (!_bulkActionService) {
    _bulkActionService = new BulkActionService(prisma);
  }
  return _bulkActionService;
}

export function resetToolsContainers(): void {
  _exportService = null;
  _importService = null;
  _bulkActionService = null;
}
