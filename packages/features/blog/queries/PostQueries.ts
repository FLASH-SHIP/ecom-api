import { ErrorWithCode } from "@ecom/lib/errors";
import type { ContentStatus } from "@ecom/prisma";
import { PrismaQueryBuilder } from "../../shared/PrismaQueryBuilder";
import type { PostRepository } from "../repositories/PostRepository";

export interface IPostQueriesDeps {
  postRepo: PostRepository;
}

export class PostQueries {
  constructor(private deps: IPostQueriesDeps) {}

  async listPosts(options: {
    status?: ContentStatus;
    authorId?: number;
    categoryId?: number;
    isFeatured?: boolean;
    search?: string;
    includeDeleted?: boolean;
    page?: number;
    perPage?: number;
    sortBy?: "createdAt" | "title" | "publishedAt" | "views";
    sortOrder?: "asc" | "desc";
  }) {
    // Map standard query options using PrismaQueryBuilder
    const filter: Record<string, unknown> = {};
    if (options.status) filter.status = options.status;
    if (options.authorId) filter.authorId = options.authorId;
    if (options.isFeatured !== undefined) filter.isFeatured = options.isFeatured;
    if (options.categoryId) {
      filter.categories = { some: { categoryId: options.categoryId } };
    }
    if (!options.includeDeleted) {
      filter.deletedAt = null;
    }

    const qbArgs = PrismaQueryBuilder.build({
      page: options.page,
      limit: options.perPage,
      sort: options.sortBy
        ? options.sortOrder === "desc"
          ? `-${options.sortBy}`
          : options.sortBy
        : undefined,
      filter,
      search: options.search,
      searchFields: ["title", "excerpt"],
    });

    // Log the generated specifications for debugging and trace analysis in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[PostQueries] dynamic query specification built: ${JSON.stringify(qbArgs)}`);
    }

    return this.deps.postRepo.findMany(options);
  }

  async getPost(id: number) {
    const post = await this.deps.postRepo.findByIdWithRelations(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");
    return post;
  }

  async getPostBySlug(slug: string) {
    const post = await this.deps.postRepo.findBySlug(slug);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");
    return post;
  }
}
