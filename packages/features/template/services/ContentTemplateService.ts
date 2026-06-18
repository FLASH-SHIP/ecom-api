import { ErrorWithCode } from "@ecom/lib/errors";
import type { ContentTemplateRepository } from "../repositories/ContentTemplateRepository";

interface IContentTemplateServiceDeps {
  templateRepo: ContentTemplateRepository;
}

export class ContentTemplateService {
  private deps: IContentTemplateServiceDeps;
  constructor(deps: IContentTemplateServiceDeps) {
    this.deps = deps;
  }

  async list(options?: { type?: string; search?: string; isActive?: boolean }) {
    return this.deps.templateRepo.findMany(options);
  }

  async get(id: number) {
    const tpl = await this.deps.templateRepo.findById(id);
    if (!tpl) throw ErrorWithCode.Factory.NotFound("Template not found");
    return tpl;
  }

  async create(data: {
    name: string;
    slug: string;
    type: string;
    content?: string;
    structure?: Record<string, unknown>;
    thumbnail?: string;
    createdBy?: number;
  }) {
    const existing = await this.deps.templateRepo.findBySlug(data.slug);
    if (existing) {
      throw ErrorWithCode.Factory.Conflict(`Template with slug "${data.slug}" already exists`);
    }
    return this.deps.templateRepo.create(data);
  }

  async update(
    id: number,
    data: {
      name?: string;
      slug?: string;
      content?: string;
      structure?: Record<string, unknown>;
      thumbnail?: string;
      isActive?: boolean;
    },
  ) {
    const existing = await this.deps.templateRepo.findById(id);
    if (!existing) throw ErrorWithCode.Factory.NotFound("Template not found");
    return this.deps.templateRepo.update(id, data);
  }

  async delete(id: number) {
    const existing = await this.deps.templateRepo.findById(id);
    if (!existing) throw ErrorWithCode.Factory.NotFound("Template not found");
    return this.deps.templateRepo.delete(id);
  }

  async duplicate(id: number) {
    const original = await this.deps.templateRepo.findById(id);
    if (!original) throw ErrorWithCode.Factory.NotFound("Template not found");

    return this.deps.templateRepo.create({
      name: `${original.name} (Copy)`,
      slug: `${original.slug}-copy-${Date.now()}`,
      type: original.type,
      content: original.content ?? undefined,
      structure: (original.structure as Record<string, unknown>) ?? undefined,
      thumbnail: original.thumbnail ?? undefined,
      createdBy: original.createdBy ?? undefined,
    });
  }
}
