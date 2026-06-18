import { SettingRepository } from "@ecom/features/setting/repositories/SettingRepository";
import { SettingService } from "@ecom/features/setting/services/SettingService";
import { prisma } from "@ecom/prisma";

// Repositories
let _settingRepository: SettingRepository | null = null;

// Services
let _settingService: SettingService | null = null;

// ─── Repositories ───────────────────────────────────

export function getSettingRepository(): SettingRepository {
  if (!_settingRepository) {
    _settingRepository = new SettingRepository(prisma);
  }
  return _settingRepository;
}

// ─── Services ───────────────────────────────────────

export function getSettingService(): SettingService {
  if (!_settingService) {
    _settingService = new SettingService({
      settingRepo: getSettingRepository(),
    });
  }
  return _settingService;
}

export function resetSettingContainers(): void {
  _settingRepository = null;
  _settingService = null;
}
