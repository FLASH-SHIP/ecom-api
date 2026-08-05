import type { IStorageAdapter } from "./IStorageAdapter";

/**
 * S3-compatible storage adapter.
 * Works with AWS S3, DigitalOcean Spaces, MinIO, Cloudflare R2, etc.
 *
 * Requires @aws-sdk/client-s3 to be installed:
 *   yarn add @aws-sdk/client-s3
 *
 * Environment variables:
 *   STORAGE_S3_BUCKET     — Bucket name
 *   STORAGE_S3_REGION     — AWS region (e.g., "ap-southeast-1")
 *   STORAGE_S3_ENDPOINT   — Custom endpoint for non-AWS (e.g., MinIO, R2)
 *   STORAGE_S3_ACCESS_KEY — Access key ID
 *   STORAGE_S3_SECRET_KEY — Secret access key
 *   STORAGE_S3_CDN_URL    — CDN URL prefix for public access (optional)
 */

// Hide module name from bundler static analysis so Turbopack/webpack
// doesn't try to resolve it at build time when S3 isn't in use.
const S3_MODULE = ["@aws-sdk", "client-s3"].join("/");

function loadS3SDK() {
  try {
    return require(S3_MODULE);
  } catch {
    throw new Error(
      'S3StorageAdapter: @aws-sdk/client-s3 is not installed. Run "yarn add @aws-sdk/client-s3"',
    );
  }
}

export class S3StorageAdapter implements IStorageAdapter {
  private bucket: string;
  private region: string;
  private endpoint?: string;
  private cdnUrl?: string;
  private client: S3Client | null = null;

  constructor(options?: {
    bucket?: string;
    region?: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    cdnUrl?: string;
  }) {
    this.bucket = options?.bucket ?? process.env.STORAGE_S3_BUCKET ?? "";
    this.region = options?.region ?? process.env.STORAGE_S3_REGION ?? "ap-southeast-1";
    this.endpoint = options?.endpoint ?? process.env.STORAGE_S3_ENDPOINT;
    this.cdnUrl = options?.cdnUrl ?? process.env.STORAGE_S3_CDN_URL;

    if (!this.bucket) {
      throw new Error("S3StorageAdapter: STORAGE_S3_BUCKET is required");
    }

    this.initClient(
      options?.accessKeyId ?? process.env.STORAGE_S3_ACCESS_KEY,
      options?.secretAccessKey ?? process.env.STORAGE_S3_SECRET_KEY,
    );
  }

  private initClient(accessKeyId?: string, secretAccessKey?: string) {
    const sdk = loadS3SDK();
    this.client = new sdk.S3Client({
      region: this.region,
      ...(this.endpoint ? { endpoint: this.endpoint, forcePathStyle: true } : {}),
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
  }

  async upload(file: Buffer, fileName: string, mimeType: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const key = `uploads/${year}/${month}/${Date.now()}-${fileName}`;

    const sdk = loadS3SDK();
    await this.client?.send(
      new sdk.PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    if (this.cdnUrl) {
      return `${this.cdnUrl}/${key}`;
    }

    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async delete(fileUrl: string): Promise<void> {
    const key = this.extractKey(fileUrl);
    if (!key) return;

    const sdk = loadS3SDK();
    await this.client?.send(
      new sdk.DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async exists(fileUrl: string): Promise<boolean> {
    const key = this.extractKey(fileUrl);
    if (!key) return false;

    try {
      const sdk = loadS3SDK();
      await this.client?.send(
        new sdk.HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async read(fileUrl: string): Promise<Buffer> {
    const key = this.extractKey(fileUrl);
    if (!key) {
      throw new Error(`Invalid file URL: ${fileUrl}`);
    }

    const sdk = loadS3SDK();
    const response = (await this.client?.send(
      new sdk.GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    )) as { Body?: { transformToByteArray(): Promise<Uint8Array> } };

    if (!response?.Body) {
      throw new Error(`S3StorageAdapter: Object body is empty for key ${key}`);
    }

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  getDiskName(): string {
    return "s3";
  }

  private extractKey(fileUrl: string): string | null {
    if (fileUrl.startsWith("uploads/")) return fileUrl;

    try {
      const url = new URL(fileUrl);
      const path = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
      return path.startsWith(`${this.bucket}/`) ? path.slice(this.bucket.length + 1) : path;
    } catch {
      return fileUrl;
    }
  }
}

// Type declaration for lazy require
interface S3Client {
  send(command: unknown): Promise<unknown>;
}
