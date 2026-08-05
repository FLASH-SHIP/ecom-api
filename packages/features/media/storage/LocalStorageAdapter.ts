import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { IStorageAdapter } from "./IStorageAdapter";

/**
 * Local disk storage adapter.
 * Stores files in `uploads/` directory at the project root.
 * Serves files via `/uploads/<year>/<month>/<filename>`.
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private basePath: string;
  private baseUrl: string;

  constructor(basePath?: string, baseUrl?: string) {
    this.basePath = basePath ?? join(process.cwd(), "uploads");
    this.baseUrl = baseUrl ?? "/uploads";
  }

  async upload(file: Buffer, fileName: string, _mimeType: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");

    // Extract subdirectories from fileName if present (e.g. "labels/EC123_456.pdf")
    const pathParts = fileName.split("/").filter((p) => p !== ".." && p !== ".");
    const actualFileName = pathParts.pop() || fileName;
    const subDirs = pathParts.length > 0 ? join(...pathParts) : "";

    const dirPath = join(this.basePath, year, month, subDirs);

    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }

    // Generate unique filename to avoid collisions
    const uniqueName = `${Date.now()}-${actualFileName}`;
    const filePath = join(dirPath, uniqueName);

    writeFileSync(filePath, file);

    const relativeSubPath = subDirs ? `${subDirs}/` : "";
    return `${this.baseUrl}/${year}/${month}/${relativeSubPath}${uniqueName}`;
  }

  async delete(fileUrl: string): Promise<void> {
    const relativePath = fileUrl.replace(this.baseUrl, "").replace(/^\/+/, "");
    const filePath = join(this.basePath, relativePath);

    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async exists(fileUrl: string): Promise<boolean> {
    const relativePath = fileUrl.replace(this.baseUrl, "").replace(/^\/+/, "");
    const filePath = join(this.basePath, relativePath);
    return existsSync(filePath);
  }

  async read(fileUrl: string): Promise<Buffer> {
    const relativePath = fileUrl.replace(this.baseUrl, "").replace(/^\/+/, "");
    const filePath = join(this.basePath, relativePath);

    if (!existsSync(filePath)) {
      throw new Error(`File not found at ${fileUrl}`);
    }

    const { readFileSync } = await import("node:fs");
    return readFileSync(filePath);
  }

  getDiskName(): string {
    return "local";
  }
}
