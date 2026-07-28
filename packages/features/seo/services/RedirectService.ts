import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import type { RedirectRepository } from "../repositories/RedirectRepository";

interface IRedirectServiceDeps {
  redirectRepo: RedirectRepository;
}

export class RedirectService {
  private deps: IRedirectServiceDeps;
  constructor(deps: IRedirectServiceDeps) {
    this.deps = deps;
  }

  async list(options?: { search?: string; isActive?: boolean; page?: number; perPage?: number }) {
    return this.deps.redirectRepo.findMany(options);
  }

  async resolve(fromPath: string) {
    const redirect = await this.deps.redirectRepo.findByFromPath(fromPath);
    if (!redirect?.isActive) return null;

    // Track hit count asynchronously
    this.deps.redirectRepo.incrementHitCount(redirect.id).catch(() => {});

    return { toPath: redirect.toPath, statusCode: redirect.statusCode };
  }

  async create(data: { fromPath: string; toPath: string; statusCode?: number; note?: string }) {
    if (data.fromPath === data.toPath) {
      throw ErrorWithCode.Factory.BadRequest("Source and destination paths cannot be the same");
    }

    const existing = await this.deps.redirectRepo.findByFromPath(data.fromPath);
    if (existing) {
      throw ErrorWithCode.Factory.Conflict("A redirect for this path already exists");
    }

    return this.deps.redirectRepo.create(data);
  }

  async update(
    id: number,
    data: {
      fromPath?: string;
      toPath?: string;
      statusCode?: number;
      isActive?: boolean;
      note?: string;
    },
  ) {
    if (data.fromPath && data.toPath && data.fromPath === data.toPath) {
      throw ErrorWithCode.Factory.BadRequest("Source and destination paths cannot be the same");
    }

    return this.deps.redirectRepo.update(id, data);
  }

  async delete(id: number) {
    return this.deps.redirectRepo.delete(id);
  }
}
