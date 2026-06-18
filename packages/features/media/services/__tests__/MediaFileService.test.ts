import { describe, expect, it, vi } from "vitest";
import { MediaFileService } from "../MediaFileService";

function createMockDeps() {
  return {
    fileRepo: {
      findMany: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      moveToFolder: vi.fn(),
      getTotalStats: vi.fn(),
    },
    storage: {
      upload: vi.fn(),
      delete: vi.fn(),
      getDiskName: vi.fn(() => "local"),
    },
  };
}

describe("MediaFileService", () => {
  it("should list files", async () => {
    const deps = createMockDeps();
    const service = new MediaFileService(deps);
    deps.fileRepo.findMany.mockResolvedValue({ items: [], total: 0 });

    const result = await service.listFiles({ page: 1 });
    expect(deps.fileRepo.findMany).toHaveBeenCalledWith({ page: 1 });
    expect(result).toEqual({ items: [], total: 0 });
  });

  it("should get a single file", async () => {
    const deps = createMockDeps();
    const service = new MediaFileService(deps);
    const file = { id: 1, name: "test.jpg" };
    deps.fileRepo.findById.mockResolvedValue(file);

    const result = await service.getFile(1);
    expect(result).toEqual(file);
  });

  it("should throw NotFound for missing file", async () => {
    const deps = createMockDeps();
    const service = new MediaFileService(deps);
    deps.fileRepo.findById.mockResolvedValue(null);

    await expect(service.getFile(999)).rejects.toThrow("File not found");
  });

  it("should upload a file with sanitized name", async () => {
    const deps = createMockDeps();
    const service = new MediaFileService(deps);
    deps.storage.upload.mockResolvedValue("/uploads/test_file.jpg");
    deps.fileRepo.create.mockResolvedValue({ id: 1, name: "test file.jpg" });

    await service.uploadFile({
      file: Buffer.from("data"),
      originalName: "test file.jpg",
      mimeType: "image/jpeg",
      size: 1024,
    });

    expect(deps.storage.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      "test_file.jpg",
      "image/jpeg",
    );
    expect(deps.fileRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "test file.jpg",
        fileName: "test_file.jpg",
        mimeType: "image/jpeg",
      }),
    );
  });

  it("should update file metadata", async () => {
    const deps = createMockDeps();
    const service = new MediaFileService(deps);
    deps.fileRepo.findById.mockResolvedValue({ id: 1, name: "old.jpg" });
    deps.fileRepo.update.mockResolvedValue({ id: 1, alt: "new alt" });

    await service.updateFile(1, { alt: "new alt" });
    expect(deps.fileRepo.update).toHaveBeenCalledWith(1, { alt: "new alt" });
  });

  it("should throw NotFound when updating missing file", async () => {
    const deps = createMockDeps();
    const service = new MediaFileService(deps);
    deps.fileRepo.findById.mockResolvedValue(null);

    await expect(service.updateFile(999, { alt: "x" })).rejects.toThrow("File not found");
  });

  it("should delete file from storage and database", async () => {
    const deps = createMockDeps();
    const service = new MediaFileService(deps);
    deps.fileRepo.findById.mockResolvedValue({ id: 1, url: "/uploads/test.jpg" });
    deps.fileRepo.delete.mockResolvedValue({ id: 1 });

    await service.deleteFile(1);
    expect(deps.storage.delete).toHaveBeenCalledWith("/uploads/test.jpg");
    expect(deps.fileRepo.delete).toHaveBeenCalledWith(1);
  });

  it("should move files to a folder", async () => {
    const deps = createMockDeps();
    const service = new MediaFileService(deps);

    await service.moveFiles([1, 2, 3], 5);
    expect(deps.fileRepo.moveToFolder).toHaveBeenCalledWith([1, 2, 3], 5);
  });

  it("should batch delete files from storage and database", async () => {
    const deps = createMockDeps();
    const service = new MediaFileService(deps);
    deps.fileRepo.findById
      .mockResolvedValueOnce({ id: 1, url: "/a.jpg" })
      .mockResolvedValueOnce({ id: 2, url: "/b.jpg" });
    deps.fileRepo.deleteMany.mockResolvedValue({ count: 2 });

    await service.deleteFiles([1, 2]);
    expect(deps.storage.delete).toHaveBeenCalledTimes(2);
    expect(deps.fileRepo.deleteMany).toHaveBeenCalledWith([1, 2]);
  });

  it("should get stats", async () => {
    const deps = createMockDeps();
    const service = new MediaFileService(deps);
    deps.fileRepo.getTotalStats.mockResolvedValue({ totalFiles: 10, totalSize: 5000 });

    const stats = await service.getStats();
    expect(stats).toEqual({ totalFiles: 10, totalSize: 5000 });
  });
});
