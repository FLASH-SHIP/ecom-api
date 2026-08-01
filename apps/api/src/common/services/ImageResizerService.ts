import * as fs from "node:fs/promises";
import * as path from "node:path";
import { BadRequestException, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import sharp from "sharp";
import { v7 as uuidv7 } from "uuid";

export interface ProcessImageOptions {
  maxWidth?: number; // Mặc định 1280
  quality?: number; // Mặc định 80
  uploadSubDir?: string; // Mặc định "topup"
}

export interface ProcessedImageResult {
  filename: string;
  relativeUrl: string;
  absolutePath: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
}

@Injectable()
export class ImageResizerService implements OnModuleInit {
  private readonly logger = new Logger(ImageResizerService.name);

  // Cache RAM danh sách thư mục YYYY/MM đã khởi tạo để tránh gọi fs.mkdir trùng lặp
  private readonly createdDirsCache = new Set<string>();

  onModuleInit() {
    // ⚡ Tối ưu RAM Server: Tắt Sharp internal memory cache để giải phóng RAM C++ tức thì ngay sau khi ghi file
    sharp.cache(false);
    // Kích hoạt tập lệnh SIMD CPU Vector
    sharp.simd(true);
  }

  /**
   * ⚡ Fast Magic Bytes Check: Kiểm tra 4-8 bytes đầu tiên của Buffer RAM (< 0.1ms)
   * Từ chối tức thì các file rác/hỏng mà không tốn CPU Sharp Engine
   */
  private isValidImageMagicBytes(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 12) return false;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;

    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;

    // WebP: RIFF ... WEBP (buffer[0..3] = 'RIFF', buffer[8..11] = 'WEBP')
    if (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return true;
    }

    // GIF: 47 49 46
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;

    // HEIC / HEIF
    const ftyp = buffer.toString("ascii", 4, 12);
    if (ftyp.includes("ftyp")) return true;

    return false;
  }

  /**
   * Đảm bảo thư mục đích tồn tại (chỉ gọi fs.mkdir 1 lần duy nhất cho mỗi thư mục YYYY/MM)
   */
  private async ensureDirectoryExists(absoluteFolderPath: string): Promise<void> {
    if (this.createdDirsCache.has(absoluteFolderPath)) {
      return;
    }
    await fs.mkdir(absoluteFolderPath, { recursive: true });
    this.createdDirsCache.add(absoluteFolderPath);
  }

  /**
   * Xử lý 1 file ảnh trực tiếp từ Buffer và lưu thành WebP (<uuidv7>.webp)
   */
  async processAndSaveImage(
    fileBuffer: Buffer,
    options: ProcessImageOptions = {},
  ): Promise<ProcessedImageResult> {
    // 1. Kiểm tra Magic Bytes trong < 0.1ms
    if (!this.isValidImageMagicBytes(fileBuffer)) {
      throw new BadRequestException("Dữ liệu file không phải định dạng ảnh hợp lệ.");
    }

    const maxWidth = options.maxWidth ?? 1280;
    const quality = options.quality ?? 80;
    const uploadSubDir = options.uploadSubDir ?? "topup";

    // 2. Tính toán thư mục Năm (YYYY) và Tháng (MM)
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const relativeFolder = `/upload/${uploadSubDir}/${year}/${month}`;
    const absoluteFolder = path.join(process.cwd(), "public", relativeFolder);

    // 3. Kiểm tra thư mục với RAM Cache
    await this.ensureDirectoryExists(absoluteFolder);

    // 4. Đặt tên file UUID v7 (.webp)
    const filename = `${uuidv7()}.webp`;
    const absoluteFilePath = path.join(absoluteFolder, filename);
    const relativeUrl = `${relativeFolder}/${filename}`;

    // ⚡ 5. WebP Fast-Path Check: Nếu file gốc đã là WebP và width <= maxWidth -> Ghi thẳng đĩa (0ms Re-encode CPU!)
    const sharpInput = sharp(fileBuffer, { failOn: "none", sequentialRead: true });
    const metadata = await sharpInput.metadata();

    if (
      metadata.format === "webp" &&
      metadata.width &&
      metadata.width <= maxWidth &&
      (!metadata.orientation || metadata.orientation === 1)
    ) {
      await fs.writeFile(absoluteFilePath, fileBuffer);
      return {
        filename,
        relativeUrl,
        absolutePath: absoluteFilePath,
        width: metadata.width,
        height: metadata.height ?? 0,
        size: fileBuffer.length,
        mimeType: "image/webp",
      };
    }

    // 6. Full Ultra Sharp Pipeline
    const info = await sharpInput
      .rotate() // Tự động xoay theo EXIF & xóa metadata dư thừa
      .resize({
        width: maxWidth,
        fit: sharp.fit.inside,
        withoutEnlargement: true,
        fastShrinkOnLoad: true, // Decode C++ giảm 75% RAM cho ảnh gốc 4K/8K
      })
      .webp({
        quality,
        effort: 4, // Tốc độ nén nén nhẹ CPU tối ưu nhất cho Web Server
        preset: "photo", // Ma trận nén ảnh chụp tối ưu nhất
        smartSubsample: true, // Giữ sắc nét viền ảnh
      })
      .toFile(absoluteFilePath); // C++ C-level file stream write

    return {
      filename,
      relativeUrl,
      absolutePath: absoluteFilePath,
      width: info.width,
      height: info.height,
      size: info.size,
      mimeType: "image/webp",
    };
  }

  /**
   * Xử lý đồng thời mảng các file ảnh (Batch Processing)
   */
  async processAndSaveMultipleImages(
    files: Array<{ buffer: Buffer }>,
    options: ProcessImageOptions = {},
  ): Promise<ProcessedImageResult[]> {
    if (!files || files.length === 0) return [];

    // Chạy song song đa luồng C++ libvips
    return Promise.all(
      files.map((file) => this.processAndSaveImage(file.buffer, options)),
    );
  }
}
