import { CustomerReceiverRepository } from "@ecom/features/customer/repositories/CustomerReceiverRepository";
import { CustomerReceiverService } from "@ecom/features/customer/services/CustomerReceiverService";
import { prisma } from "@ecom/prisma";

let _customerReceiverRepository: CustomerReceiverRepository | null = null;
let _customerReceiverService: CustomerReceiverService | null = null;

export function getCustomerReceiverRepository(): CustomerReceiverRepository {
  if (!_customerReceiverRepository) {
    _customerReceiverRepository = new CustomerReceiverRepository(prisma);
  }
  return _customerReceiverRepository;
}

export function getCustomerReceiverService(): CustomerReceiverService {
  if (!_customerReceiverService) {
    _customerReceiverService = new CustomerReceiverService({
      receiverRepo: getCustomerReceiverRepository(),
    });
  }
  return _customerReceiverService;
}

export function resetCustomerReceiverContainers(): void {
  _customerReceiverRepository = null;
  _customerReceiverService = null;
}
