import { AuditLogRepository } from "@ecom/features/audit/repositories/AuditLogRepository";
import { RequestLogRepository } from "@ecom/features/audit/repositories/RequestLogRepository";
import { AuditService } from "@ecom/features/audit/services/AuditService";
import { prisma } from "@ecom/prisma";

// Repositories
let _auditLogRepository: AuditLogRepository | null = null;
let _requestLogRepository: RequestLogRepository | null = null;

// Services
let _auditService: AuditService | null = null;

// ─── Repositories ───────────────────────────────────

export function getAuditLogRepository(): AuditLogRepository {
  if (!_auditLogRepository) {
    _auditLogRepository = new AuditLogRepository(prisma);
  }
  return _auditLogRepository;
}

export function getRequestLogRepository(): RequestLogRepository {
  if (!_requestLogRepository) {
    _requestLogRepository = new RequestLogRepository(prisma);
  }
  return _requestLogRepository;
}

// ─── Services ───────────────────────────────────────

export function getAuditService(): AuditService {
  if (!_auditService) {
    _auditService = new AuditService({
      auditLogRepo: getAuditLogRepository(),
      requestLogRepo: getRequestLogRepository(),
      prisma,
    });
  }
  return _auditService;
}

export function resetAuditContainers(): void {
  _auditLogRepository = null;
  _requestLogRepository = null;
  _auditService = null;
}
