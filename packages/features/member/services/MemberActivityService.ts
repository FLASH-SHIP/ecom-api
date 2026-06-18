import type { MemberActivityLogRepository } from "../repositories/MemberActivityLogRepository";

interface IMemberActivityServiceDeps {
  activityLogRepo: MemberActivityLogRepository;
}

export class MemberActivityService {
  private deps: IMemberActivityServiceDeps;
  constructor(deps: IMemberActivityServiceDeps) {
    this.deps = deps;
  }

  async logActivity(data: {
    memberId: number;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.deps.activityLogRepo.create(data);
  }

  async getActivityHistory(memberId: number, options?: { page?: number; perPage?: number }) {
    return this.deps.activityLogRepo.findByMember(memberId, options);
  }

  async getMemberStats(memberId: number) {
    return this.deps.activityLogRepo.getStats(memberId);
  }
}
