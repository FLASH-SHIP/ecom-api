import { Module } from "@nestjs/common";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { ImageResizerService } from "../../common/services/ImageResizerService";
import { UploadController } from "../../common/controllers/UploadController";

@Module({
  controllers: [MediaController, UploadController],
  providers: [MediaService, ImageResizerService],
  exports: [MediaService, ImageResizerService],
})
export class MediaModule {}
