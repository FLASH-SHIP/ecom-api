import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { createLogger } from "@flash-ship/ecom-lib/logger";
import type { ContentStatus } from "@ecom/prisma";
import { PrismaQueryBuilder } from "../../shared/PrismaQueryBuilder";
import type { PostRepository } from "../repositories/PostRepository";

export interface IPostQueriesDeps {
  postRepo: PostRepository;
}

const log = createLogger("PostQueries");

export class PostQueries {
  constructor(private deps: IPostQueriesDeps) {}

  async listPosts(options: {
    status?: ContentStatus;
    authorId?: string;
    categoryId?: number;
    isFeatured?: boolean;
    search?: string;
    includeDeleted?: boolean;
    page?: number;
    perPage?: number;
    sortBy?: "id" | "title" | "status" | "createdAt" | "publishedAt" | "views";
    sortOrder?: "asc" | "desc";
    where?: Record<string, unknown>;
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

    log.debug("Dynamic query specification built", { queryArgs: qbArgs });

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
