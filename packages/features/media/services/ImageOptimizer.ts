import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("ImageOptimizer");

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

interface OptimizeResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

/**
 * Optimizes images on upload using Sharp (if available).
 *
 * - Resizes to maxWidth/maxHeight while preserving aspect ratio
 * - Compresses with reasonable quality defaults
 * - Strips EXIF metadata
 * - Falls back to original buffer if Sharp is not installed
 *
 * Install Sharp: yarn add sharp
 */
export async function optimizeImage(
  buffer: Buffer,
  mimeType: string,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  },
): Promise<OptimizeResult | null> {
  if (!IMAGE_MIME_TYPES.has(mimeType)) return null;
  if (mimeType === "image/gif") return null; // Skip animated GIFs

  const maxWidth = options?.maxWidth ?? 2048;
  const maxHeight = options?.maxHeight ?? 2048;
  const quality = options?.quality ?? 82;

  try {
    const sharp = require("sharp");

    const image = sharp(buffer).rotate(); // Auto-orient from EXIF

    const metadata = await image.metadata();
    const originalWidth = metadata.width ?? 0;
    const originalHeight = metadata.height ?? 0;

    // Only resize if larger than limits
    const needsResize = originalWidth > maxWidth || originalHeight > maxHeight;

    let pipeline = image;
    if (needsResize) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Convert to format with quality
    switch (mimeType) {
      case "image/jpeg":
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        break;
      case "image/png":
        pipeline = pipeline.png({ quality, compressionLevel: 9 });
        break;
      case "image/webp":
        pipeline = pipeline.webp({ quality });
        break;
      case "image/avif":
        pipeline = pipeline.avif({ quality });
        break;
    }

    const output = await pipeline.toBuffer({ resolveWithObject: true });

    const savings = buffer.length - output.data.length;
    if (savings > 0) {
      log.info("Image optimized", {
        originalSize: buffer.length,
        optimizedSize: output.data.length,
        savings: `${Math.round((savings / buffer.length) * 100)}%`,
        dimensions: `${output.info.width}x${output.info.height}`,
      });
    }

    return {
      buffer: output.data,
      width: output.info.width,
      height: output.info.height,
      format: output.info.format,
    };
  } catch (_err) {
    log.warn("Sharp not available, skipping image optimization");
    return null;
  }
}
