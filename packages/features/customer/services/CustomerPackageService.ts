import { ErrorCode } from "@flash-ship/ecom-lib/errorCodes";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { runInTransaction } from "@ecom/prisma";
import type { CustomerPackageRepository } from "../repositories/CustomerPackageRepository";

export interface ICustomerPackageServiceDeps {
  packageRepo: CustomerPackageRepository;
}

export class CustomerPackageService {
  private deps: ICustomerPackageServiceDeps;

  constructor(deps: ICustomerPackageServiceDeps) {
    this.deps = deps;
  }

  async listByCustomer(customerId: string) {
    return this.deps.packageRepo.findByCustomerId(customerId);
  }

  async create(
    customerId: string,
    data: {
      label?: string | null;
      packageName: string;
      packingTypeId: number;
      length?: number | null;
      width?: number | null;
      height?: number | null;
      weight: number;
      isDefault?: boolean;
    },
  ) {
    if (!data.packageName.trim()) {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Package name is required", 422);
    }
    if (data.weight <= 0) {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Weight must be greater than 0", 422);
    }

    // Auto-set as default if this is the customer's first package record
    return runInTransaction(async () => {
      const existingCount = await this.deps.packageRepo.countByCustomerId(customerId);
      const isFirstRecord = existingCount === 0;
      const finalIsDefault = isFirstRecord || !!data.isDefault;

      if (finalIsDefault && !isFirstRecord) {
        await this.deps.packageRepo.resetDefault(customerId);
      }

      return this.deps.packageRepo.create({ ...data, customerId, isDefault: finalIsDefault });
    });
  }

  async update(
    id: number,
    customerId: string,
    data: {
      label?: string | null;
      packageName?: string;
      packingTypeId?: number;
      length?: number | null;
      width?: number | null;
      height?: number | null;
      weight?: number;
      isDefault?: boolean;
    },
  ) {
    const pkg = await this.deps.packageRepo.findById(id);
    if (!pkg || pkg.customerId !== customerId) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Package not found", 404);
    }

    if (data.packageName !== undefined && !data.packageName.trim()) {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Package name is required", 422);
    }
    if (data.weight !== undefined && data.weight <= 0) {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Weight must be greater than 0", 422);
    }

    if (data.isDefault) {
      return runInTransaction(async () => {
        await this.deps.packageRepo.resetDefault(customerId);
        return this.deps.packageRepo.update(id, data);
      });
    }

    return this.deps.packageRepo.update(id, data);
  }

  async delete(id: number, customerId: string) {
    const pkg = await this.deps.packageRepo.findById(id);
    if (!pkg || pkg.customerId !== customerId) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Package not found", 404);
    }

    return this.deps.packageRepo.softDelete(id);
  }

  async setDefault(id: number, customerId: string) {
    const pkg = await this.deps.packageRepo.findById(id);
    if (!pkg || pkg.customerId !== customerId) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Package not found", 404);
    }

    return runInTransaction(async () => {
      await this.deps.packageRepo.resetDefault(customerId);
      return this.deps.packageRepo.update(id, { isDefault: true });
    });
  }
}
