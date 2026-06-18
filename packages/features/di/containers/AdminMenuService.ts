import { AdminMenuRepository } from "@ecom/features/admin-menu/repositories/AdminMenuRepository";
import { AdminMenuService } from "@ecom/features/admin-menu/services/AdminMenuService";
import { prisma } from "@ecom/prisma";

// Repositories
let _adminMenuRepository: AdminMenuRepository | null = null;

// Services
let _adminMenuService: AdminMenuService | null = null;

// ─── Repositories ───────────────────────────────────

export function getAdminMenuRepository(): AdminMenuRepository {
  if (!_adminMenuRepository) {
    _adminMenuRepository = new AdminMenuRepository(prisma);
  }
  return _adminMenuRepository;
}

// ─── Services ───────────────────────────────────────

export function getAdminMenuService(): AdminMenuService {
  if (!_adminMenuService) {
    _adminMenuService = new AdminMenuService({
      adminMenuRepo: getAdminMenuRepository(),
    });
  }
  return _adminMenuService;
}

export function resetAdminMenuContainers(): void {
  _adminMenuRepository = null;
  _adminMenuService = null;
}
