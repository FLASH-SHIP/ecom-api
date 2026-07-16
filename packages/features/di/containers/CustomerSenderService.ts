import { CustomerSenderRepository } from "@ecom/features/customer/repositories/CustomerSenderRepository";
import { CustomerSenderService } from "@ecom/features/customer/services/CustomerSenderService";
import { prisma } from "@ecom/prisma";

let _customerSenderRepository: CustomerSenderRepository | null = null;
let _customerSenderService: CustomerSenderService | null = null;

export function getCustomerSenderRepository(): CustomerSenderRepository {
  if (!_customerSenderRepository) {
    _customerSenderRepository = new CustomerSenderRepository(prisma);
  }
  return _customerSenderRepository;
}

export function getCustomerSenderService(): CustomerSenderService {
  if (!_customerSenderService) {
    _customerSenderService = new CustomerSenderService({
      senderRepo: getCustomerSenderRepository(),
    });
  }
  return _customerSenderService;
}

export function resetCustomerSenderContainers(): void {
  _customerSenderRepository = null;
  _customerSenderService = null;
}
