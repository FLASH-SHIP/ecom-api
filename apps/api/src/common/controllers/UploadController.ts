import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { ImageResizerService } from "../services/ImageResizerService";

/**
 * Controller xử lý Upload và Nén Ảnh cho Tool Resizer Image
 * Route API: POST /api/v1/upload/topup
 */
@Controller({
  path: "upload",
  version: "1",
})
export class UploadController {
  constructor(
    @Inject(ImageResizerService) private readonly resizerService: ImageResizerService,
  ) {}

  /**
   * API Upload danh sách ảnh chứng từ nạp tiền
   * - Hỗ trợ tối đa 10 tập tin ảnh (mỗi tập tin tối đa 10MB)
   * - Tự động nén qua Sharp Engine thành định dạng WebP quality 80, max width 1280px
   * - Đặt tên file theo chuẩn UUID v7 và phân tách thư mục theo Năm/Tháng
   */
  @Post("topup")
  @UseInterceptors(
    FilesInterceptor("files", 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 10MB mỗi file
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.match(/^image\/(png|jpeg|jpg|webp|heic|gif)$/i)) {
          return callback(
            new BadRequestException("Chỉ chấp nhận file ảnh (*.png, *.jpg, *.jpeg, *.webp)"),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadTopupImages(@UploadedFiles() files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      throw new BadRequestException("Vui lòng gửi ít nhất 1 file ảnh.");
    }

    // Xử lý nén ảnh song song qua ImageResizerService
    const results = await this.resizerService.processAndSaveMultipleImages(files, {
      uploadSubDir: "topup",
      maxWidth: 1280,
      quality: 80,
    });

    // Trả về danh sách các đường dẫn tương đối (relativeUrls)
    return {
      success: true,
      data: results.map((r) => r.relativeUrl),
    };
  }
}
