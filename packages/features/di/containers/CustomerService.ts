import { CustomerActivityLogRepository } from "@ecom/features/customer/repositories/CustomerActivityLogRepository";
import { CustomerRepository } from "@ecom/features/customer/repositories/CustomerRepository";
import { CustomerActivityService } from "@ecom/features/customer/services/CustomerActivityService";
import { CustomerAuthService } from "@ecom/features/customer/services/CustomerAuthService";
import { CustomerService } from "@ecom/features/customer/services/CustomerService";
import { CustomerTokenService } from "@ecom/features/customer/services/CustomerTokenService";
import { prisma } from "@ecom/prisma";

let _customerRepository: CustomerRepository | null = null;
let _customerActivityLogRepository: CustomerActivityLogRepository | null = null;
let _customerService: CustomerService | null = null;
let _customerAuthService: CustomerAuthService | null = null;
let _customerTokenService: CustomerTokenService | null = null;
let _customerActivityService: CustomerActivityService | null = null;

export function getCustomerRepository(): CustomerRepository {
  if (!_customerRepository) {
    _customerRepository = new CustomerRepository(prisma);
  }
  return _customerRepository;
}

export function getCustomerActivityLogRepository(): CustomerActivityLogRepository {
  if (!_customerActivityLogRepository) {
    _customerActivityLogRepository = new CustomerActivityLogRepository(prisma);
  }
  return _customerActivityLogRepository;
}

export function getCustomerService(): CustomerService {
  if (!_customerService) {
    _customerService = new CustomerService({
      customerRepo: getCustomerRepository(),
    });
  }
  return _customerService;
}

export function getCustomerAuthService(): CustomerAuthService {
  if (!_customerAuthService) {
    _customerAuthService = new CustomerAuthService({
      customerRepo: getCustomerRepository(),
    });
  }
  return _customerAuthService;
}

export function getCustomerTokenService(): CustomerTokenService {
  if (!_customerTokenService) {
    _customerTokenService = new CustomerTokenService();
  }
  return _customerTokenService;
}

export function getCustomerActivityService(): CustomerActivityService {
  if (!_customerActivityService) {
    _customerActivityService = new CustomerActivityService({
      activityLogRepo: getCustomerActivityLogRepository(),
    });
  }
  return _customerActivityService;
}

export function resetCustomerContainers(): void {
  _customerRepository = null;
  _customerActivityLogRepository = null;
  _customerService = null;
  _customerAuthService = null;
  _customerTokenService = null;
  _customerActivityService = null;
}
