import { describe, expect, it, vi } from "vitest";
import { PageService } from "../PageService";

function createMockDeps() {
  return {
    pageRepo: {
      findMany: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      findBySlugExact: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    },
    revisionRepo: {
      create: vi.fn(),
      findByReference: vi.fn(),
      findById: vi.fn(),
    },
  };
}

describe("PageService", () => {
  it("should list pages", async () => {
    const deps = createMockDeps();
    const service = new PageService(deps);
    deps.pageRepo.findMany.mockResolvedValue({ items: [], total: 0 });

    const result = await service.listPages({ page: 1 });
    expect(deps.pageRepo.findMany).toHaveBeenCalledWith({ page: 1 });
    expect(result.total).toBe(0);
  });

  it("should get page by id", async () => {
    const deps = createMockDeps();
    const service = new PageService(deps);
    deps.pageRepo.findById.mockResolvedValue({ id: 1, title: "About" });

    const result = await service.getPage(1);
    expect(result.title).toBe("About");
  });

  it("should throw NotFound for missing page", async () => {
    const deps = createMockDeps();
    const service = new PageService(deps);
    deps.pageRepo.findById.mockResolvedValue(null);

    await expect(service.getPage(999)).rejects.toThrow("Page not found");
  });

  it("should get page by slug", async () => {
    const deps = createMockDeps();
    const service = new PageService(deps);
    deps.pageRepo.findBySlug.mockResolvedValue({ id: 1, slug: "about" });

    const result = await service.getPageBySlug("about");
    expect(result.slug).toBe("about");
  });

  it("should create page", async () => {
    const deps = createMockDeps();
    const service = new PageService(deps);
    deps.pageRepo.findBySlugExact.mockResolvedValue(null);
    deps.pageRepo.create.mockResolvedValue({ id: 1, title: "New Page", slug: "new-page" });

    const result = await service.createPage({
      title: "New Page",
      slug: "new-page",
      authorId: 1,
    });
    expect(result.title).toBe("New Page");
  });

  it("should throw Conflict for duplicate slug on create", async () => {
    const deps = createMockDeps();
    const service = new PageService(deps);
    deps.pageRepo.findBySlugExact.mockResolvedValue({ id: 2, slug: "about" });

    await expect(
      service.createPage({ title: "About", slug: "about", authorId: 1 }),
    ).rejects.toThrow("Slug already in use");
  });

  it("should update page and save revision", async () => {
    const deps = createMockDeps();
    const service = new PageService(deps);
    deps.pageRepo.findById.mockResolvedValue({
      id: 1,
      title: "Old Title",
      slug: "old",
      content: "Old content",
      status: "DRAFT",
    });
    deps.pageRepo.update.mockResolvedValue({ id: 1, title: "New Title" });

    await service.updatePage(1, { title: "New Title" }, 1);

    expect(deps.revisionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceId: 1,
        referenceType: "page",
        title: "Old Title",
      }),
    );
    expect(deps.pageRepo.update).toHaveBeenCalled();
  });

  it("should set publishedAt when publishing", async () => {
    const deps = createMockDeps();
    const service = new PageService(deps);
    deps.pageRepo.findById.mockResolvedValue({
      id: 1,
      title: "Page",
      slug: "page",
      content: null,
      status: "DRAFT",
    });
    deps.pageRepo.update.mockResolvedValue({ id: 1 });

    await service.updatePage(1, { status: "PUBLISHED" as never }, 1);
    const updateCall = deps.pageRepo.update.mock.calls[0][1];
    expect(updateCall.publishedAt).toBeInstanceOf(Date);
  });

  it("should soft delete page", async () => {
    const deps = createMockDeps();
    const service = new PageService(deps);
    deps.pageRepo.findById.mockResolvedValue({ id: 1 });

    await service.deletePage(1);
    expect(deps.pageRepo.softDelete).toHaveBeenCalledWith(1);
  });

  it("should throw NotFound when deleting missing page", async () => {
    const deps = createMockDeps();
    const service = new PageService(deps);
    deps.pageRepo.findById.mockResolvedValue(null);

    await expect(service.deletePage(999)).rejects.toThrow("Page not found");
  });

  it("should get revisions for a page", async () => {
    const deps = createMockDeps();
    const service = new PageService(deps);
    deps.revisionRepo.findByReference.mockResolvedValue([{ id: 1 }]);

    const result = await service.getRevisions(1);
    expect(result).toHaveLength(1);
    expect(deps.revisionRepo.findByReference).toHaveBeenCalledWith(1, "page");
  });

  it("should get single revision", async () => {
    const deps = createMockDeps();
    const service = new PageService(deps);
    deps.revisionRepo.findById.mockResolvedValue({ id: 1, title: "Rev" });

    const result = await service.getRevision(1);
    expect(result.title).toBe("Rev");
  });

  it("should throw NotFound for missing revision", async () => {
    const deps = createMockDeps();
    const service = new PageService(deps);
    deps.revisionRepo.findById.mockResolvedValue(null);

    await expect(service.getRevision(999)).rejects.toThrow("Revision not found");
  });
});
