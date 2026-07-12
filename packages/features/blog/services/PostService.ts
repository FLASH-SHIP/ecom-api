import type { RevisionService } from "@ecom/features/revision/services/RevisionService";
import type { ContentStatus } from "@ecom/prisma";
import { PostCommands } from "../commands/PostCommands";
import { PostQueries } from "../queries/PostQueries";
import type { PostRepository } from "../repositories/PostRepository";
import type { SlugService } from "./SlugService";

interface IPostServiceDeps {
  postRepo: PostRepository;
  slugService: SlugService;
  revisionService?: RevisionService;
}

export class PostService {
  private queries: PostQueries;
  private commands: PostCommands;

  constructor(deps: IPostServiceDeps) {
    this.queries = new PostQueries({ postRepo: deps.postRepo });
    this.commands = new PostCommands({
      postRepo: deps.postRepo,
      slugService: deps.slugService,
      revisionService: deps.revisionService,
    });
  }

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
    return this.queries.listPosts(options);
  }

  async getPost(id: number) {
    return this.queries.getPost(id);
  }

  async getPostBySlug(slug: string) {
    return this.queries.getPostBySlug(slug);
  }

  async createPost(data: {
    title: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    featuredImage?: string;
    bannerImage?: string;
    isFeatured?: boolean;
    allowComments?: boolean;
    formatType?: string;
    externalSource?: string;
    sponsoredBy?: string;
    status?: ContentStatus;
    authorId: string;
    categoryIds?: number[];
    tagIds?: number[];
  }) {
    return this.commands.createPost(data);
  }

  async updatePost(
    id: number,
    data: {
      title?: string;
      slug?: string;
      content?: string;
      excerpt?: string;
      featuredImage?: string | null;
      bannerImage?: string | null;
      isFeatured?: boolean;
      allowComments?: boolean;
      formatType?: string | null;
      externalSource?: string | null;
      sponsoredBy?: string | null;
      status?: ContentStatus;
      categoryIds?: number[];
      tagIds?: number[];
      authorId?: string;
    },
  ) {
    return this.commands.updatePost(id, data);
  }

  async publishPost(id: number) {
    return this.commands.publishPost(id);
  }

  async archivePost(id: number) {
    return this.commands.archivePost(id);
  }

  async recordView(id: number) {
    return this.commands.recordView(id);
  }

  async deletePost(id: number) {
    return this.commands.deletePost(id);
  }

  async restorePost(id: number) {
    return this.commands.restorePost(id);
  }

  async permanentlyDeletePost(id: number) {
    return this.commands.permanentlyDeletePost(id);
  }

  async clonePost(id: number, authorId: string) {
    return this.commands.clonePost(id, authorId);
  }
}
