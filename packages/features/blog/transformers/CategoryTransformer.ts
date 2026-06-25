import { BaseTransformer } from "@ecom/lib";

export interface CategoryResponseDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isFeatured: boolean;
  isDefault: boolean;
  status: string;
  parentId: number | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    posts: number;
  };
}

export interface CategoryInput {
  id: number;
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  isFeatured?: number;
  isDefault?: number;
  status?: string;
  parentId?: number | null;
  order?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  _count?: {
    posts: number;
  };
}

export class CategoryTransformer extends BaseTransformer<CategoryInput, CategoryResponseDto> {
  transform(category: CategoryInput): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name ?? "",
      slug: category.slug ?? "",
      description: category.description ?? null,
      icon: category.icon ?? null,
      isFeatured: !!category.isFeatured,
      isDefault: !!category.isDefault,
      status: category.status ?? "PUBLISHED",
      parentId: category.parentId ?? null,
      order: category.order ?? 0,
      createdAt:
        category.createdAt instanceof Date
          ? category.createdAt.toISOString()
          : (category.createdAt ?? new Date().toISOString()),
      updatedAt:
        category.updatedAt instanceof Date
          ? category.updatedAt.toISOString()
          : (category.updatedAt ?? new Date().toISOString()),
      _count: category._count
        ? {
            posts: category._count.posts ?? 0,
          }
        : undefined,
    };
  }
}
