/**
 * Storage adapter interface — abstracts file storage behind a common API.
 * Currently implemented: LocalStorageAdapter (local disk).
 * Future: S3StorageAdapter, CloudflareR2Adapter, etc.
 */
export interface IStorageAdapter {
  /** Upload a file and return its public URL */
  upload(file: Buffer, fileName: string, mimeType: string): Promise<string>;

  /** Delete a file by its URL or path */
  delete(fileUrl: string): Promise<void>;

  /** Check if a file exists */
  exists(fileUrl: string): Promise<boolean>;

  /** Get the disk name (e.g., "local", "s3") */
  getDiskName(): string;
}
