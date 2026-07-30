import * as fs from "node:fs/promises";
import * as path from "node:path";
import { describe, expect, it, beforeAll } from "vitest";
import sharp from "sharp";
import { ImageResizerService } from "../common/services/ImageResizerService";

describe("ImageResizerService", () => {
  let service: ImageResizerService;

  beforeAll(() => {
    service = new ImageResizerService();
    service.onModuleInit();
  });

  it("should reject invalid magic bytes buffer with BadRequestException", async () => {
    const fakeBuffer = Buffer.from("THIS_IS_NOT_AN_IMAGE_FILE");
    await expect(service.processAndSaveImage(fakeBuffer)).rejects.toThrow(
      "Dữ liệu file không phải định dạng ảnh hợp lệ.",
    );
  });

  it("should process valid image buffer, convert to webp and return relativeUrl under public/upload/topup/YYYY/MM", async () => {
    // Generate a 100x100 red PNG buffer using Sharp
    const samplePngBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await service.processAndSaveImage(samplePngBuffer, {
      uploadSubDir: "topup",
      maxWidth: 1280,
      quality: 80,
    });

    expect(result).toBeDefined();
    expect(result.filename).toMatch(/\.webp$/);
    expect(result.mimeType).toBe("image/webp");
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    expect(result.relativeUrl).toMatch(new RegExp(`^/upload/topup/${year}/${month}/.+\\.webp$`));

    // Verify file actually exists on disk
    const fileStat = await fs.stat(result.absolutePath);
    expect(fileStat.isFile()).toBe(true);

    // Clean up created test file
    await fs.unlink(result.absolutePath).catch(() => {});
  });
});
