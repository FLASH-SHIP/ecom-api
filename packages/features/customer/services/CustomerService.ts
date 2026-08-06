import { USERNAME_REGEX, USERNAME_VALIDATION_MESSAGE } from "@ecom/features/customer/constants";
import { ExternalWalletClient } from "@ecom/features/topup/clients/ExternalWalletClient";
import type { CustomerStatus } from "@ecom/prisma";
import { hashPassword } from "@flash-ship/ecom-lib/crypto";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { Logger } from "@nestjs/common";
import type { CustomerRepository } from "../repositories/CustomerRepository";

export interface ICustomerServiceDeps {
  customerRepo: CustomerRepository;
}

export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);
  private deps: ICustomerServiceDeps;
  constructor(deps: ICustomerServiceDeps) {
    this.deps = deps;
  }

  async listCustomers(
    filters: { status?: CustomerStatus; search?: string; groupId?: number; rateCardId?: number },
    page?: number,
    perPage?: number,
  ) {
    return this.deps.customerRepo.findMany(filters, page, perPage);
  }

  async getCustomer(id: string) {
    return this.deps.customerRepo.findById(id);
  }

  async createCustomer(data: {
    email: string;
    username?: string;
    name?: string;
    phone?: string;
    dob?: Date;
    gender?: string;
    description?: string;
    hashedPassword?: string;
    groupId?: number | null;
  }) {
    const existing = await this.deps.customerRepo.findByEmail(data.email);
    if (existing) {
      throw ErrorWithCode.Factory.Conflict("Customer with this email already exists");
    }

    let username = data.username;
    if (username) {
      if (!USERNAME_REGEX.test(username)) {
        throw ErrorWithCode.Factory.BadRequest(USERNAME_VALIDATION_MESSAGE);
      }
      const available = await this.deps.customerRepo.isUsernameAvailable(username);
      if (!available) {
        throw ErrorWithCode.Factory.Conflict("Username is already taken");
      }
    } else {
      username = await this.deps.customerRepo.generateUniqueUsername(data.email);
    }

    const newCustomer = await this.deps.customerRepo.create({ ...data, username });

    // Tối ưu hiệu năng tuyệt đối: Khởi tạo tài khoản ví mới cho Admin create Customer chạy ngầm (Non-blocking Async) -> 0ms Latency
    setImmediate(async () => {
      try {
        const walletClient = new ExternalWalletClient();
        await walletClient.createAccount({
          partnerId: newCustomer.id,
          partnerCode: newCustomer.customerCode || "",
        });
        this.logger.log(`Tạo tài khoản ví trực tiếp thành công trong background (Non-blocking 0ms Latency): ${newCustomer.id}`);
      } catch (walletError) {
        this.logger.error(
          `Tạo tài khoản ví thất bại trong background (customerId=${newCustomer.id}):`,
          walletError,
        );
      }
    });

    return newCustomer;
  }

  async updateCustomer(
    id: string,
    data: {
      username?: string;
      name?: string;
      phone?: string;
      avatarUrl?: string;
      dob?: Date | null;
      gender?: string | null;
      description?: string | null;
      status?: CustomerStatus;
      groupId?: number | null;
    },
    options?: { bypassUsernameLimit?: boolean },
  ) {
    if (data.username === undefined) {
      return this.deps.customerRepo.update(id, data);
    }

    const normalized = await this.#validateAndNormalizeUsername(
      id,
      data.username,
      options?.bypassUsernameLimit,
    );

    if (options?.bypassUsernameLimit) {
      return this.deps.customerRepo.update(id, {
        ...data,
        username: normalized.value,
        usernameChangedAt: new Date(),
      });
    }

    return this.deps.customerRepo.update(id, {
      ...data,
      username: normalized.value,
      usernameChangeCount: normalized.newCount,
      usernameChangedAt: new Date(),
    });
  }

  // Returns normalized username and the incremented change count
  async #validateAndNormalizeUsername(
    id: string,
    username: string,
    bypassLimit?: boolean,
  ): Promise<{ value: string; newCount: number }> {
    const normalized = username.toLowerCase();
    if (!USERNAME_REGEX.test(normalized)) {
      throw ErrorWithCode.Factory.BadRequest(USERNAME_VALIDATION_MESSAGE);
    }

    const current = await this.deps.customerRepo.findById(id);
    if (!current) throw ErrorWithCode.Factory.NotFound("Customer not found");

    if (current.username !== normalized) {
      const available = await this.deps.customerRepo.isUsernameAvailable(normalized);
      if (!available) {
        throw ErrorWithCode.Factory.Conflict("Username is already taken");
      }
    }

    if (!bypassLimit && current.usernameChangeCount >= 1) {
      throw ErrorWithCode.Factory.Forbidden(
        "You have already changed your username. Please contact admin for further changes.",
      );
    }

    return { value: normalized, newCount: (current.usernameChangeCount ?? 0) + 1 };
  }

  async deleteCustomer(id: string) {
    return this.deps.customerRepo.delete(id);
  }

  async getStats() {
    return this.deps.customerRepo.getStats();
  }

  async checkUsernameAvailability(username: string) {
    return this.deps.customerRepo.isUsernameAvailable(username.toLowerCase());
  }

  async verifyCustomerEmail(id: string) {
    return this.deps.customerRepo.verifyEmail(id);
  }

  async setCustomerPassword(id: string, password: string) {
    const hashedPwd = await hashPassword(password);
    return this.deps.customerRepo.updatePassword(id, hashedPwd);
  }

  async listVerificationCodes(search?: string, page?: number, perPage?: number) {
    return this.deps.customerRepo.findVerificationCodes(search, page, perPage);
  }
}
