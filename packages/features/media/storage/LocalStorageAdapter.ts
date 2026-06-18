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
    const dirPath = join(this.basePath, year, month);

    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }

    // Generate unique filename to avoid collisions
    const uniqueName = `${Date.now()}-${fileName}`;
    const filePath = join(dirPath, uniqueName);

    writeFileSync(filePath, file);

    return `${this.baseUrl}/${year}/${month}/${uniqueName}`;
  }

  async delete(fileUrl: string): Promise<void> {
    const relativePath = fileUrl.replace(this.baseUrl, "");
    const filePath = join(this.basePath, relativePath);

    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async exists(fileUrl: string): Promise<boolean> {
    const relativePath = fileUrl.replace(this.baseUrl, "");
    const filePath = join(this.basePath, relativePath);
    return existsSync(filePath);
  }

  getDiskName(): string {
    return "local";
  }
}
