import { ProvinceRepository } from "@ecom/features/administrative/repositories/ProvinceRepository";
import { WardRepository } from "@ecom/features/administrative/repositories/WardRepository";
import { AdministrativeService } from "@ecom/features/administrative/services/AdministrativeService";
import { prisma } from "@ecom/prisma";

let _provinceRepository: ProvinceRepository | null = null;
let _wardRepository: WardRepository | null = null;
let _administrativeService: AdministrativeService | null = null;

export function getProvinceRepository(): ProvinceRepository {
  if (!_provinceRepository) {
    _provinceRepository = new ProvinceRepository(prisma);
  }
  return _provinceRepository;
}

export function getWardRepository(): WardRepository {
  if (!_wardRepository) {
    _wardRepository = new WardRepository(prisma);
  }
  return _wardRepository;
}

export function getAdministrativeService(): AdministrativeService {
  if (!_administrativeService) {
    _administrativeService = new AdministrativeService({
      provinceRepo: getProvinceRepository(),
      wardRepo: getWardRepository(),
    });
  }
  return _administrativeService;
}

export function resetAdministrativeService() {
  _provinceRepository = null;
  _wardRepository = null;
  _administrativeService = null;
}
