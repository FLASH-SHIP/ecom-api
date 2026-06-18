import type { MemberStatus } from "@prisma/client";
import type { MemberRepository } from "../repositories/MemberRepository";

export interface IMemberServiceDeps {
  memberRepo: MemberRepository;
}

export class MemberService {
  private deps: IMemberServiceDeps;
  constructor(deps: IMemberServiceDeps) {
    this.deps = deps;
  }

  async listMembers(
    filters: { status?: MemberStatus; search?: string },
    page?: number,
    perPage?: number,
  ) {
    return this.deps.memberRepo.findMany(filters, page, perPage);
  }

  async getMember(id: number) {
    return this.deps.memberRepo.findById(id);
  }

  async createMember(data: { email: string; name?: string; phone?: string }) {
    const existing = await this.deps.memberRepo.findByEmail(data.email);
    if (existing) {
      throw new Error("Member with this email already exists");
    }
    return this.deps.memberRepo.create(data);
  }

  async updateMember(
    id: number,
    data: { name?: string; phone?: string; avatarUrl?: string; status?: MemberStatus },
  ) {
    return this.deps.memberRepo.update(id, data);
  }

  async deleteMember(id: number) {
    return this.deps.memberRepo.delete(id);
  }

  async getStats() {
    return this.deps.memberRepo.getStats();
  }
}
