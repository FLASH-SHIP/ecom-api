import { CategoryRepository } from "@ecom/features/blog/repositories/CategoryRepository";
import { PostRepository } from "@ecom/features/blog/repositories/PostRepository";
import { SlugRepository } from "@ecom/features/blog/repositories/SlugRepository";
import { TagRepository } from "@ecom/features/blog/repositories/TagRepository";
import { CategoryService } from "@ecom/features/blog/services/CategoryService";
import { PostService } from "@ecom/features/blog/services/PostService";
import { SlugService } from "@ecom/features/blog/services/SlugService";
import { TagService } from "@ecom/features/blog/services/TagService";
import { getRevisionService } from "@ecom/features/di/containers/RevisionService";
import { prisma } from "@ecom/prisma";

// Repositories
let _postRepository: PostRepository | null = null;
let _categoryRepository: CategoryRepository | null = null;
let _tagRepository: TagRepository | null = null;
let _slugRepository: SlugRepository | null = null;

// Services
let _slugService: SlugService | null = null;
let _postService: PostService | null = null;
let _categoryService: CategoryService | null = null;
let _tagService: TagService | null = null;

// ─── Repositories ───────────────────────────────────

export function getPostRepository(): PostRepository {
  if (!_postRepository) {
    _postRepository = new PostRepository(prisma);
  }
  return _postRepository;
}

export function getCategoryRepository(): CategoryRepository {
  if (!_categoryRepository) {
    _categoryRepository = new CategoryRepository(prisma);
  }
  return _categoryRepository;
}

export function getTagRepository(): TagRepository {
  if (!_tagRepository) {
    _tagRepository = new TagRepository(prisma);
  }
  return _tagRepository;
}

export function getSlugRepository(): SlugRepository {
  if (!_slugRepository) {
    _slugRepository = new SlugRepository(prisma);
  }
  return _slugRepository;
}

// ─── Services ───────────────────────────────────────

export function getSlugService(): SlugService {
  if (!_slugService) {
    _slugService = new SlugService({
      slugRepo: getSlugRepository(),
    });
  }
  return _slugService;
}

export function getPostService(): PostService {
  if (!_postService) {
    _postService = new PostService({
      postRepo: getPostRepository(),
      slugService: getSlugService(),
      revisionService: getRevisionService(),
    });
  }
  return _postService;
}

export function getCategoryService(): CategoryService {
  if (!_categoryService) {
    _categoryService = new CategoryService({
      categoryRepo: getCategoryRepository(),
      slugService: getSlugService(),
    });
  }
  return _categoryService;
}

export function getTagService(): TagService {
  if (!_tagService) {
    _tagService = new TagService({
      tagRepo: getTagRepository(),
      slugService: getSlugService(),
    });
  }
  return _tagService;
}

export function resetBlogContainers(): void {
  _postRepository = null;
  _categoryRepository = null;
  _tagRepository = null;
  _slugRepository = null;
  _slugService = null;
  _postService = null;
  _categoryService = null;
  _tagService = null;
}
