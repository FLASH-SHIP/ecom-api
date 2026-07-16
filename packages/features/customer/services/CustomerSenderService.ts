import { ErrorCode } from "@ecom/lib/errorCodes";
import { ErrorWithCode } from "@ecom/lib/errors";
import { runInTransaction } from "@ecom/prisma";
import type { CustomerSenderRepository } from "../repositories/CustomerSenderRepository";

export interface ICustomerSenderServiceDeps {
  senderRepo: CustomerSenderRepository;
}

export class CustomerSenderService {
  private deps: ICustomerSenderServiceDeps;

  constructor(deps: ICustomerSenderServiceDeps) {
    this.deps = deps;
  }

  async listByCustomer(customerId: string) {
    return this.deps.senderRepo.findByCustomerId(customerId);
  }

  async create(
    customerId: string,
    data: {
      label?: string | null;
      name: string;
      phone?: string | null;
      email?: string | null;
      address: string;
      city: string;
      ward?: string | null;
      zipCode?: string | null;
      country?: string;
      isDefault?: boolean;
    },
  ) {
    if (!data.name.trim()) {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Sender name is required", 422);
    }
    if (!data.address.trim()) {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Sender address is required", 422);
    }

    if (data.isDefault) {
      return runInTransaction(async () => {
        await this.deps.senderRepo.resetDefault(customerId);
        return this.deps.senderRepo.create({ ...data, customerId });
      });
    }

    return this.deps.senderRepo.create({ ...data, customerId });
  }

  async update(
    id: number,
    customerId: string,
    data: {
      label?: string | null;
      name?: string;
      phone?: string | null;
      email?: string | null;
      address?: string;
      city?: string;
      ward?: string | null;
      zipCode?: string | null;
      country?: string;
      isDefault?: boolean;
    },
  ) {
    const sender = await this.deps.senderRepo.findById(id);
    if (!sender || sender.customerId !== customerId) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Sender not found", 404);
    }

    if (data.isDefault) {
      return runInTransaction(async () => {
        await this.deps.senderRepo.resetDefault(customerId);
        return this.deps.senderRepo.update(id, data);
      });
    }

    return this.deps.senderRepo.update(id, data);
  }

  async delete(id: number, customerId: string) {
    const sender = await this.deps.senderRepo.findById(id);
    if (!sender || sender.customerId !== customerId) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Sender not found", 404);
    }

    return this.deps.senderRepo.softDelete(id);
  }

  async setDefault(id: number, customerId: string) {
    const sender = await this.deps.senderRepo.findById(id);
    if (!sender || sender.customerId !== customerId) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Sender not found", 404);
    }

    return runInTransaction(async () => {
      await this.deps.senderRepo.resetDefault(customerId);
      return this.deps.senderRepo.update(id, { isDefault: true });
    });
  }
}
