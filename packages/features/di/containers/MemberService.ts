import { MemberRepository } from "@ecom/features/member/repositories/MemberRepository";
import { MemberAuthService } from "@ecom/features/member/services/MemberAuthService";
import { MemberService } from "@ecom/features/member/services/MemberService";
import { MemberTokenService } from "@ecom/features/member/services/MemberTokenService";
import { prisma } from "@ecom/prisma";

let _memberRepository: MemberRepository | null = null;
let _memberService: MemberService | null = null;
let _memberAuthService: MemberAuthService | null = null;
let _memberTokenService: MemberTokenService | null = null;

export function getMemberRepository(): MemberRepository {
  if (!_memberRepository) {
    _memberRepository = new MemberRepository(prisma);
  }
  return _memberRepository;
}

export function getMemberService(): MemberService {
  if (!_memberService) {
    _memberService = new MemberService({
      memberRepo: getMemberRepository(),
    });
  }
  return _memberService;
}

export function getMemberAuthService(): MemberAuthService {
  if (!_memberAuthService) {
    _memberAuthService = new MemberAuthService({
      memberRepo: getMemberRepository(),
    });
  }
  return _memberAuthService;
}

export function getMemberTokenService(): MemberTokenService {
  if (!_memberTokenService) {
    _memberTokenService = new MemberTokenService();
  }
  return _memberTokenService;
}

export function resetMemberContainers(): void {
  _memberRepository = null;
  _memberService = null;
  _memberAuthService = null;
  _memberTokenService = null;
}
