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
    const senders = await this.deps.senderRepo.findByCustomerId(customerId);
    return this.resolveSenderNames(senders);
  }

  private async resolveSenderNames<T extends { city: string; ward: string | null }>(senders: T[]) {
    if (senders.length === 0) return [];

    const cityCodes = Array.from(
      new Set(senders.map((s) => Number(s.city)).filter((c) => !Number.isNaN(c) && c > 0)),
    );
    const wardCodes = Array.from(
      new Set(
        senders.map((s) => Number(s.ward)).filter((w) => w !== null && !Number.isNaN(w) && w > 0),
      ),
    );

    const [provinces, wards] = await Promise.all([
      cityCodes.length > 0 ? this.deps.senderRepo.findProvincesByCodes(cityCodes) : [],
      wardCodes.length > 0 ? this.deps.senderRepo.findWardsByCodes(wardCodes) : [],
    ]);

    const provinceMap = new Map<number, string>(provinces.map((p) => [p.code, p.name] as const));
    const wardMap = new Map<number, string>(wards.map((w) => [w.code, w.name] as const));

    return senders.map((s) => {
      const cityCodeNum = Number(s.city);
      const wardCodeNum = Number(s.ward);
      return {
        ...s,
        cityName: !Number.isNaN(cityCodeNum) ? provinceMap.get(cityCodeNum) || s.city : s.city,
        wardName: !Number.isNaN(wardCodeNum) ? wardMap.get(wardCodeNum) || s.ward : s.ward,
      };
    });
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

    // Auto-set as default if this is the customer's first sender record
    const result = await runInTransaction(async () => {
      const existingCount = await this.deps.senderRepo.countByCustomerId(customerId);
      const isFirstRecord = existingCount === 0;
      const finalIsDefault = isFirstRecord || !!data.isDefault;

      if (finalIsDefault && !isFirstRecord) {
        await this.deps.senderRepo.resetDefault(customerId);
      }

      return this.deps.senderRepo.create({ ...data, customerId, isDefault: finalIsDefault });
    });

    const resolved = await this.resolveSenderNames([result]);
    return resolved[0];
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

    let result: Awaited<ReturnType<CustomerSenderRepository["update"]>>;

    if (data.isDefault) {
      result = await runInTransaction(async () => {
        await this.deps.senderRepo.resetDefault(customerId);
        return this.deps.senderRepo.update(id, data);
      });
    } else {
      result = await this.deps.senderRepo.update(id, data);
    }

    const resolved = await this.resolveSenderNames([result]);
    return resolved[0];
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
