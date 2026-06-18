import { ErrorWithCode } from "@ecom/lib/errors";
import type { TaxonomyRepository } from "../repositories/TaxonomyRepository";

interface ITaxonomyServiceDeps {
  taxonomyRepo: TaxonomyRepository;
}

export class TaxonomyService {
  private deps: ITaxonomyServiceDeps;
  constructor(deps: ITaxonomyServiceDeps) {
    this.deps = deps;
  }

  async list(options?: {
    type?: string;
    parentId?: number | null;
    search?: string;
    page?: number;
    perPage?: number;
  }) {
    return this.deps.taxonomyRepo.findMany(options);
  }

  async get(id: number) {
    const item = await this.deps.taxonomyRepo.findById(id);
    if (!item) throw ErrorWithCode.Factory.NotFound("Taxonomy not found");
    return item;
  }

  async getTree(type: string) {
    return this.deps.taxonomyRepo.getTree(type);
  }

  async getTypes() {
    return this.deps.taxonomyRepo.getTypes();
  }

  async create(data: {
    name: string;
    slug: string;
    type: string;
    description?: string;
    parentId?: number;
    order?: number;
    metadata?: Record<string, unknown>;
  }) {
    // Check for duplicate slug+type
    const existing = await this.deps.taxonomyRepo.findBySlugAndType(data.slug, data.type);
    if (existing) {
      throw ErrorWithCode.Factory.Conflict(
        `A taxonomy with slug "${data.slug}" already exists for type "${data.type}"`,
      );
    }

    // Prevent circular reference
    if (data.parentId) {
      const parent = await this.deps.taxonomyRepo.findById(data.parentId);
      if (!parent) throw ErrorWithCode.Factory.NotFound("Parent taxonomy not found");
      if (parent.type !== data.type) {
        throw ErrorWithCode.Factory.BadRequest("Parent must be of the same type");
      }
    }

    return this.deps.taxonomyRepo.create(data);
  }

  async update(
    id: number,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      parentId?: number | null;
      order?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    const existing = await this.deps.taxonomyRepo.findById(id);
    if (!existing) throw ErrorWithCode.Factory.NotFound("Taxonomy not found");

    // Prevent self-referencing
    if (data.parentId === id) {
      throw ErrorWithCode.Factory.BadRequest("A taxonomy cannot be its own parent");
    }

    return this.deps.taxonomyRepo.update(id, data);
  }

  async delete(id: number) {
    const existing = await this.deps.taxonomyRepo.findById(id);
    if (!existing) throw ErrorWithCode.Factory.NotFound("Taxonomy not found");

    // Check children
    if (existing.children && existing.children.length > 0) {
      throw ErrorWithCode.Factory.BadRequest(
        "Cannot delete a taxonomy with children. Remove or reassign children first.",
      );
    }

    return this.deps.taxonomyRepo.delete(id);
  }
}
