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

@Controller({
  path: "upload",
  version: "1",
})
export class UploadController {
  constructor(
    @Inject(ImageResizerService) private readonly resizerService: ImageResizerService,
  ) {}

  @Post("topup")
  @UseInterceptors(
    FilesInterceptor("files", 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
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

    const results = await this.resizerService.processAndSaveMultipleImages(files, {
      uploadSubDir: "topup",
      maxWidth: 1280,
      quality: 80,
    });

    return {
      success: true,
      data: results.map((r) => r.relativeUrl),
    };
  }
}
