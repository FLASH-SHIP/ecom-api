import { runInTransaction } from "@ecom/prisma";
import { ErrorCode } from "@flash-ship/ecom-lib/errorCodes";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import type { CustomerReceiverRepository } from "../repositories/CustomerReceiverRepository";

export interface ICustomerReceiverServiceDeps {
  receiverRepo: CustomerReceiverRepository;
}

export class CustomerReceiverService {
  private deps: ICustomerReceiverServiceDeps;

  constructor(deps: ICustomerReceiverServiceDeps) {
    this.deps = deps;
  }

  async listByCustomer(customerId: string) {
    const receivers = await this.deps.receiverRepo.findByCustomerId(customerId);

    // Extract unique state and city codes
    const codes = Array.from(
      new Set(receivers.flatMap((r) => [r.state, r.city]).filter((code) => !!code)),
    );

    const divisions =
      codes.length > 0 ? await this.deps.receiverRepo.findDivisionsByCodes("US", codes) : [];

    const divisionMap = new Map(divisions.map((d) => [d.code, d.name]));

    return receivers.map((r) => ({
      ...r,
      stateName: divisionMap.get(r.state) || r.state,
      cityName: divisionMap.get(r.city) || r.city,
    }));
  }

  async create(
    customerId: string,
    data: {
      label?: string | null;
      name: string;
      phone?: string | null;
      email?: string | null;
      address1: string;
      address2?: string | null;
      city: string;
      state: string;
      zipCode: string;
      country?: string;
      isDefault?: boolean;
    },
  ) {
    if (!data.name.trim()) {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Receiver name is required", 422);
    }
    if (!data.address1.trim()) {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Receiver address is required", 422);
    }

    // Auto-set as default if this is the customer's first receiver record
    return runInTransaction(async () => {
      const existingCount = await this.deps.receiverRepo.countByCustomerId(customerId);
      const isFirstRecord = existingCount === 0;
      const finalIsDefault = isFirstRecord || !!data.isDefault;

      if (finalIsDefault && !isFirstRecord) {
        await this.deps.receiverRepo.resetDefault(customerId);
      }

      return this.deps.receiverRepo.create({ ...data, customerId, isDefault: finalIsDefault });
    });
  }

  async update(
    id: number,
    customerId: string,
    data: {
      label?: string | null;
      name?: string;
      phone?: string | null;
      email?: string | null;
      address1?: string;
      address2?: string | null;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      isDefault?: boolean;
    },
  ) {
    const receiver = await this.deps.receiverRepo.findById(id);
    if (!receiver || receiver.customerId !== customerId) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Receiver not found", 404);
    }

    if (data.isDefault) {
      return runInTransaction(async () => {
        await this.deps.receiverRepo.resetDefault(customerId);
        return this.deps.receiverRepo.update(id, data);
      });
    }

    return this.deps.receiverRepo.update(id, data);
  }

  async delete(id: number, customerId: string) {
    const receiver = await this.deps.receiverRepo.findById(id);
    if (!receiver || receiver.customerId !== customerId) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Receiver not found", 404);
    }

    return this.deps.receiverRepo.softDelete(id);
  }

  async setDefault(id: number, customerId: string) {
    const receiver = await this.deps.receiverRepo.findById(id);
    if (!receiver || receiver.customerId !== customerId) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Receiver not found", 404);
    }

    return runInTransaction(async () => {
      await this.deps.receiverRepo.resetDefault(customerId);
      return this.deps.receiverRepo.update(id, { isDefault: true });
    });
  }
}
