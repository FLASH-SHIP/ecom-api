import { CustomerPackageRepository } from "@ecom/features/customer/repositories/CustomerPackageRepository";
import { CustomerPackageService } from "@ecom/features/customer/services/CustomerPackageService";
import { prisma } from "@ecom/prisma";

let _customerPackageRepository: CustomerPackageRepository | null = null;
let _customerPackageService: CustomerPackageService | null = null;

export function getCustomerPackageRepository(): CustomerPackageRepository {
  if (!_customerPackageRepository) {
    _customerPackageRepository = new CustomerPackageRepository(prisma);
  }
  return _customerPackageRepository;
}

export function getCustomerPackageService(): CustomerPackageService {
  if (!_customerPackageService) {
    _customerPackageService = new CustomerPackageService({
      packageRepo: getCustomerPackageRepository(),
    });
  }
  return _customerPackageService;
}

export function resetCustomerPackageContainers(): void {
  _customerPackageRepository = null;
  _customerPackageService = null;
}
