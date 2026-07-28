import type { PageRepository } from "@ecom/features/page/repositories/PageRepository";
import type { RevisionRepository } from "@ecom/features/shared/repositories/RevisionRepository";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import type { ContentStatus, Prisma } from "@ecom/prisma";

export interface IPageServiceDeps {
  pageRepo: PageRepository;
  revisionRepo: RevisionRepository;
}

export class PageService {
  private deps: IPageServiceDeps;
  constructor(deps: IPageServiceDeps) {
    this.deps = deps;
  }

  async listPages(params: {
    search?: string;
    status?: ContentStatus;
    parentId?: number | null;
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    where?: Record<string, unknown>;
  }) {
    return this.deps.pageRepo.findMany(params);
  }

  async getPage(id: number) {
    const page = await this.deps.pageRepo.findById(id);
    if (!page) throw ErrorWithCode.Factory.NotFound("Page not found");
    return page;
  }

  async getPageBySlug(slug: string) {
    const page = await this.deps.pageRepo.findBySlug(slug);
    if (!page) throw ErrorWithCode.Factory.NotFound("Page not found");
    return page;
  }

  async createPage(data: {
    title: string;
    slug: string;
    content?: string;
    excerpt?: string;
    featuredImage?: string;
    template?: string;
    order?: number;
    parentId?: number;
    status?: ContentStatus;
    authorId: string;
    bannerImage?: string;
    heroBanner?: string;
    layout?: string;
    hideTitle?: boolean;
    hideBreadcrumb?: boolean;
    hideSidebar?: boolean;
    hideFooter?: boolean;
    gallery?: Prisma.InputJsonValue;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
  }) {
    const existing = await this.deps.pageRepo.findBySlugExact(data.slug);
    if (existing) throw ErrorWithCode.Factory.Conflict("Slug already in use");

    return this.deps.pageRepo.create(data);
  }

  async updatePage(
    id: number,
    data: {
      title?: string;
      slug?: string;
      content?: string;
      excerpt?: string;
      featuredImage?: string;
      template?: string;
      order?: number;
      parentId?: number | null;
      status?: ContentStatus;
      bannerImage?: string;
      heroBanner?: string;
      layout?: string;
      hideTitle?: boolean;
      hideBreadcrumb?: boolean;
      hideSidebar?: boolean;
      hideFooter?: boolean;
      gallery?: Prisma.InputJsonValue;
      subtitle?: string;
      ctaText?: string;
      ctaLink?: string;
    },
    authorId: string,
  ) {
    const page = await this.deps.pageRepo.findById(id);
    if (!page) throw ErrorWithCode.Factory.NotFound("Page not found");

    if (data.slug && data.slug !== page.slug) {
      const existing = await this.deps.pageRepo.findBySlugExact(data.slug);
      if (existing && existing.id !== id) {
        throw ErrorWithCode.Factory.Conflict("Slug already in use");
      }
    }

    // Save revision before updating
    await this.deps.revisionRepo.create({
      referenceId: id,
      referenceType: "page",
      title: page.title,
      content: page.content ?? undefined,
      authorId,
    });

    const publishedAt =
      data.status === "PUBLISHED" && page.status !== "PUBLISHED" ? new Date() : undefined;

    return this.deps.pageRepo.update(id, {
      ...data,
      ...(publishedAt ? { publishedAt } : {}),
    });
  }

  async deletePage(id: number) {
    const page = await this.deps.pageRepo.findById(id);
    if (!page) throw ErrorWithCode.Factory.NotFound("Page not found");
    return this.deps.pageRepo.softDelete(id);
  }

  async getRevisions(pageId: number) {
    return this.deps.revisionRepo.findByReference(pageId, "page");
  }

  async getRevision(revisionId: number) {
    const revision = await this.deps.revisionRepo.findById(revisionId);
    if (!revision) throw ErrorWithCode.Factory.NotFound("Revision not found");
    return revision;
  }
}
