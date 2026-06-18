import { categoryCache } from "@ecom/lib/cache";
import { ErrorWithCode } from "@ecom/lib/errors";
import type { ContentStatus } from "@ecom/prisma";
import type { CategoryRepository } from "../repositories/CategoryRepository";
import type { SlugService } from "./SlugService";

interface ICategoryServiceDeps {
  categoryRepo: CategoryRepository;
  slugService: SlugService;
}

export class CategoryService {
  private deps: ICategoryServiceDeps;
  constructor(deps: ICategoryServiceDeps) {
    this.deps = deps;
  }

  async listCategories(options?: {
    status?: ContentStatus;
    parentId?: number | null;
    includeDeleted?: boolean;
    page?: number;
    perPage?: number;
  }) {
    return this.deps.categoryRepo.findMany(options);
  }

  async getCategoryTree() {
    type TreeResult = Awaited<ReturnType<typeof this.deps.categoryRepo.findTree>>;
    const cached = categoryCache.get("tree") as TreeResult | undefined;
    if (cached) return cached;
    const tree = await this.deps.categoryRepo.findTree();
    categoryCache.set("tree", tree);
    return tree;
  }

  async getCategory(id: number) {
    const category = await this.deps.categoryRepo.findByIdWithRelations(id);
    if (!category) throw ErrorWithCode.Factory.NotFound("Category not found");
    return category;
  }

  async getCategoryBySlug(slug: string) {
    const category = await this.deps.categoryRepo.findBySlug(slug);
    if (!category) throw ErrorWithCode.Factory.NotFound("Category not found");
    return category;
  }

  async createCategory(data: {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    isFeatured?: boolean;
    isDefault?: boolean;
    status?: ContentStatus;
    parentId?: number;
    authorId?: number;
    order?: number;
  }) {
    const { slug: customSlug, ...rest } = data;

    const slugRecord = await this.deps.slugService.createSlug(0, "Category", data.name, customSlug);

    const category = await this.deps.categoryRepo.create({
      ...rest,
      slug: slugRecord.key,
    });

    await this.deps.slugService.updateSlug(category.id, "Category", data.name, slugRecord.key);

    categoryCache.invalidate("tree");
    return category;
  }

  async updateCategory(
    id: number,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
      icon?: string | null;
      isFeatured?: boolean;
      isDefault?: boolean;
      status?: ContentStatus;
      parentId?: number | null;
      order?: number;
    },
  ) {
    const existing = await this.deps.categoryRepo.findById(id);
    if (!existing) throw ErrorWithCode.Factory.NotFound("Category not found");

    // Prevent circular parent reference
    if (data.parentId === id) {
      throw ErrorWithCode.Factory.BadRequest("Category cannot be its own parent");
    }

    const { slug: customSlug, ...categoryData } = data;

    const updatedCategory = await this.deps.categoryRepo.update(id, categoryData);

    if (data.name || customSlug) {
      const slugRecord = await this.deps.slugService.updateSlug(
        id,
        "Category",
        data.name ?? existing.name,
        customSlug,
      );
      if (slugRecord.key !== updatedCategory.slug) {
        await this.deps.categoryRepo.update(id, { slug: slugRecord.key });
      }
    }

    categoryCache.invalidate("tree");
    return this.deps.categoryRepo.findByIdWithRelations(id);
  }

  async deleteCategory(id: number) {
    const category = await this.deps.categoryRepo.findById(id);
    if (!category) throw ErrorWithCode.Factory.NotFound("Category not found");

    if (category.isDefault) {
      throw ErrorWithCode.Factory.BadRequest("Cannot delete the default category");
    }

    categoryCache.invalidate("tree");
    return this.deps.categoryRepo.softDelete(id);
  }

  async restoreCategory(id: number) {
    const category = await this.deps.categoryRepo.findById(id);
    if (!category) throw ErrorWithCode.Factory.NotFound("Category not found");

    categoryCache.invalidate("tree");
    return this.deps.categoryRepo.restore(id);
  }

  async permanentlyDeleteCategory(id: number) {
    const category = await this.deps.categoryRepo.findById(id);
    if (!category) throw ErrorWithCode.Factory.NotFound("Category not found");

    if (category.isDefault) {
      throw ErrorWithCode.Factory.BadRequest("Cannot delete the default category");
    }

    await this.deps.slugService.deleteSlug(id, "Category");
    return this.deps.categoryRepo.hardDelete(id);
  }
}
