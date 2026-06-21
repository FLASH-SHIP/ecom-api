import type { CustomerActivityLogRepository } from "../repositories/CustomerActivityLogRepository";

interface ICustomerActivityServiceDeps {
  activityLogRepo: CustomerActivityLogRepository;
}

export class CustomerActivityService {
  private deps: ICustomerActivityServiceDeps;
  constructor(deps: ICustomerActivityServiceDeps) {
    this.deps = deps;
  }

  async logActivity(data: {
    customerId: number;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.deps.activityLogRepo.create(data);
  }

  async getActivityHistory(customerId: number, options?: { page?: number; perPage?: number }) {
    return this.deps.activityLogRepo.findByCustomer(customerId, options);
  }

  async getCustomerStats(customerId: number) {
    return this.deps.activityLogRepo.getStats(customerId);
  }
}
