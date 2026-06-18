import { describe, expect, it, vi } from "vitest";
import { MediaFolderService } from "../MediaFolderService";

function createMockDeps() {
  return {
    folderRepo: {
      findMany: vi.fn(),
      findById: vi.fn(),
      findByIdWithChildren: vi.fn(),
      findTree: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      hasChildren: vi.fn(),
      hasFiles: vi.fn(),
    },
  };
}

describe("MediaFolderService", () => {
  it("should list folders", async () => {
    const deps = createMockDeps();
    const service = new MediaFolderService(deps);
    deps.folderRepo.findMany.mockResolvedValue([]);

    const result = await service.listFolders();
    expect(result).toEqual([]);
  });

  it("should get a folder with children", async () => {
    const deps = createMockDeps();
    const service = new MediaFolderService(deps);
    const folder = { id: 1, name: "Photos", children: [] };
    deps.folderRepo.findByIdWithChildren.mockResolvedValue(folder);

    const result = await service.getFolder(1);
    expect(result).toEqual(folder);
  });

  it("should throw NotFound for missing folder", async () => {
    const deps = createMockDeps();
    const service = new MediaFolderService(deps);
    deps.folderRepo.findByIdWithChildren.mockResolvedValue(null);

    await expect(service.getFolder(999)).rejects.toThrow("Folder not found");
  });

  it("should get folder tree", async () => {
    const deps = createMockDeps();
    const service = new MediaFolderService(deps);
    deps.folderRepo.findTree.mockResolvedValue([{ id: 1, name: "Root" }]);

    const result = await service.getFolderTree();
    expect(result).toHaveLength(1);
  });

  it("should create a folder with auto-slug", async () => {
    const deps = createMockDeps();
    const service = new MediaFolderService(deps);
    deps.folderRepo.create.mockResolvedValue({ id: 1, name: "My Photos", slug: "my-photos" });

    await service.createFolder({ name: "My Photos" });
    expect(deps.folderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "My Photos", slug: "my-photos" }),
    );
  });

  it("should validate parent exists before creating", async () => {
    const deps = createMockDeps();
    const service = new MediaFolderService(deps);
    deps.folderRepo.findById.mockResolvedValue(null);

    await expect(service.createFolder({ name: "Sub", parentId: 999 })).rejects.toThrow(
      "Parent folder not found",
    );
  });

  it("should update folder name and auto-slug", async () => {
    const deps = createMockDeps();
    const service = new MediaFolderService(deps);
    deps.folderRepo.findById.mockResolvedValue({ id: 1, name: "Old" });

    await service.updateFolder(1, { name: "New Name" });
    expect(deps.folderRepo.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: "New Name", slug: "new-name" }),
    );
  });

  it("should prevent circular reference", async () => {
    const deps = createMockDeps();
    const service = new MediaFolderService(deps);
    deps.folderRepo.findById.mockResolvedValue({ id: 1, name: "Folder" });

    await expect(service.updateFolder(1, { parentId: 1 })).rejects.toThrow(
      "cannot be its own parent",
    );
  });

  it("should delete empty folder", async () => {
    const deps = createMockDeps();
    const service = new MediaFolderService(deps);
    deps.folderRepo.findById.mockResolvedValue({ id: 1 });
    deps.folderRepo.hasChildren.mockResolvedValue(false);
    deps.folderRepo.hasFiles.mockResolvedValue(false);

    await service.deleteFolder(1);
    expect(deps.folderRepo.delete).toHaveBeenCalledWith(1);
  });

  it("should block delete if has children (non-force)", async () => {
    const deps = createMockDeps();
    const service = new MediaFolderService(deps);
    deps.folderRepo.findById.mockResolvedValue({ id: 1 });
    deps.folderRepo.hasChildren.mockResolvedValue(true);

    await expect(service.deleteFolder(1, false)).rejects.toThrow("has subfolders");
  });

  it("should block delete if has files (non-force)", async () => {
    const deps = createMockDeps();
    const service = new MediaFolderService(deps);
    deps.folderRepo.findById.mockResolvedValue({ id: 1 });
    deps.folderRepo.hasChildren.mockResolvedValue(false);
    deps.folderRepo.hasFiles.mockResolvedValue(true);

    await expect(service.deleteFolder(1, false)).rejects.toThrow("contains files");
  });

  it("should force delete folder with children", async () => {
    const deps = createMockDeps();
    const service = new MediaFolderService(deps);
    deps.folderRepo.findById.mockResolvedValue({ id: 1 });

    await service.deleteFolder(1, true);
    expect(deps.folderRepo.delete).toHaveBeenCalledWith(1);
    expect(deps.folderRepo.hasChildren).not.toHaveBeenCalled();
  });
});
