import { ErrorWithCode } from "@ecom/lib/errors";
import type { MediaFileRepository } from "../repositories/MediaFileRepository";
import type { IStorageAdapter } from "../storage/IStorageAdapter";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const BLOCKED_MIME_TYPES = new Set([
  "application/x-msdownload",
  "application/x-executable",
  "application/x-sharedlib",
  "application/x-shellscript",
  "text/x-php",
  "application/x-php",
  "application/x-httpd-php",
  "application/javascript",
  "text/javascript",
]);

const BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".php",
  ".jsp",
  ".cgi",
  ".pl",
  ".py",
  ".rb",
  ".com",
  ".msi",
  ".scr",
  ".pif",
  ".hta",
  ".vbs",
  ".wsf",
]);

interface IMediaFileServiceDeps {
  fileRepo: MediaFileRepository;
  storage: IStorageAdapter;
}

export class MediaFileService {
  private deps: IMediaFileServiceDeps;
  constructor(deps: IMediaFileServiceDeps) {
    this.deps = deps;
  }

  async listFiles(options?: {
    folderId?: number | null;
    mimeType?: string;
    search?: string;
    page?: number;
    perPage?: number;
    sortBy?: "createdAt" | "name" | "size";
    sortOrder?: "asc" | "desc";
  }) {
    return this.deps.fileRepo.findMany(options);
  }

  async getFile(id: number) {
    const file = await this.deps.fileRepo.findById(id);
    if (!file) throw ErrorWithCode.Factory.NotFound("File not found");
    return file;
  }

  async uploadFile(data: {
    file: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
    alt?: string;
    description?: string;
    folderId?: number | null;
    uploadedBy?: string;
  }) {
    // Validate file size
    if (data.size > MAX_FILE_SIZE) {
      throw ErrorWithCode.Factory.BadRequest(
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      );
    }

    // Validate MIME type
    if (BLOCKED_MIME_TYPES.has(data.mimeType)) {
      throw ErrorWithCode.Factory.BadRequest(
        `File type "${data.mimeType}" is not allowed for security reasons.`,
      );
    }

    // Validate extension
    const ext = data.originalName.substring(data.originalName.lastIndexOf(".")).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw ErrorWithCode.Factory.BadRequest(
        `File extension "${ext}" is not allowed for security reasons.`,
      );
    }

    // Sanitize filename (prevent path traversal)
    const sanitizedName = data.originalName.replace(/\.\./g, "").replace(/[^a-zA-Z0-9._-]/g, "_");

    // Optimize images (resize, compress, strip EXIF)
    let fileBuffer = data.file;
    let fileWidth = data.width;
    let fileHeight = data.height;
    let fileSize = data.size;

    const { optimizeImage } = await import("./ImageOptimizer");
    const optimized = await optimizeImage(fileBuffer, data.mimeType);
    if (optimized) {
      fileBuffer = optimized.buffer;
      fileWidth = optimized.width;
      fileHeight = optimized.height;
      fileSize = optimized.buffer.length;
    }

    const url = await this.deps.storage.upload(fileBuffer, sanitizedName, data.mimeType);

    return this.deps.fileRepo.create({
      name: data.originalName,
      fileName: sanitizedName,
      mimeType: data.mimeType,
      size: fileSize,
      url,
      disk: this.deps.storage.getDiskName(),
      width: fileWidth,
      height: fileHeight,
      alt: data.alt,
      description: data.description,
      folderId: data.folderId,
      uploadedBy: data.uploadedBy,
    });
  }

  async updateFile(
    id: number,
    data: {
      name?: string;
      alt?: string;
      description?: string;
      folderId?: number | null;
    },
  ) {
    const existing = await this.deps.fileRepo.findById(id);
    if (!existing) throw ErrorWithCode.Factory.NotFound("File not found");

    return this.deps.fileRepo.update(id, data);
  }

  async deleteFile(id: number) {
    const file = await this.deps.fileRepo.findById(id);
    if (!file) throw ErrorWithCode.Factory.NotFound("File not found");

    // Delete from storage
    await this.deps.storage.delete(file.url);

    // Delete from database
    return this.deps.fileRepo.delete(id);
  }

  async moveFiles(ids: number[], folderId: number | null) {
    return this.deps.fileRepo.moveToFolder(ids, folderId);
  }

  async deleteFiles(ids: number[]) {
    // Get all files first to delete from storage
    for (const id of ids) {
      const file = await this.deps.fileRepo.findById(id);
      if (file) {
        await this.deps.storage.delete(file.url);
      }
    }

    return this.deps.fileRepo.deleteMany(ids);
  }

  async getStats() {
    return this.deps.fileRepo.getTotalStats();
  }

  /**
   * Delete a file by its storage URL.
   * Deletes both the storage object and the DB record.
   * Returns true if found and deleted, false if the URL is not tracked in the DB
   * (e.g. an external URL — in that case only the storage object is attempted).
   */
  async deleteByUrl(url: string): Promise<boolean> {
    const record = await this.deps.fileRepo.findByUrl(url);

    if (record) {
      // Tracked in DB — delete storage then record
      await this.deps.storage.delete(url);
      await this.deps.fileRepo.delete(record.id);
      return true;
    }

    // Not tracked in DB (external or orphaned) — try storage cleanup anyway
    try {
      await this.deps.storage.delete(url);
    } catch {
      // Ignore storage errors for untracked files
    }
    return false;
  }
}
