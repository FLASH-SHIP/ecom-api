import type { IStorageAdapter } from "./IStorageAdapter";
import { LocalStorageAdapter } from "./LocalStorageAdapter";

/**
 * Factory for creating storage adapters based on environment configuration.
 *
 * Set STORAGE_DISK=s3 to use S3, otherwise defaults to local.
 *
 * For S3, first install: yarn add @aws-sdk/client-s3
 */
let _instance: IStorageAdapter | null = null;

export function getStorageAdapter(): IStorageAdapter {
  if (_instance) return _instance;

  const disk = process.env.STORAGE_DISK ?? "local";

  if (disk === "s3") {
    // S3 adapter is loaded lazily at runtime — NOT at build time.
    // This avoids bundler errors when @aws-sdk/client-s3 is not installed.
    throw new Error(
      "S3 storage requires async initialization. Use getStorageAdapterAsync() instead, " +
        "or install @aws-sdk/client-s3 and call initS3Adapter() at app startup.",
    );
  }

  _instance = new LocalStorageAdapter();
  return _instance;
}

/**
 * Async factory — required for S3 adapter to avoid bundler static analysis.
 * Call once at app startup and cache the result.
 */
export async function getStorageAdapterAsync(): Promise<IStorageAdapter> {
  if (_instance) return _instance;

  const disk = process.env.STORAGE_DISK ?? "local";

  if (disk === "s3") {
    const { S3StorageAdapter } = await import("./S3StorageAdapter");
    _instance = new S3StorageAdapter();
  } else {
    _instance = new LocalStorageAdapter();
  }

  return _instance;
}

export function resetStorageAdapter(): void {
  _instance = null;
}
