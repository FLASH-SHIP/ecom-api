import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  Req,
  Inject,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MediaService, MediaAction } from "./media.service";

@Controller("media")
export class MediaController {
  constructor(@Inject(MediaService) private readonly mediaService: MediaService) {}

  private getBaseUrl(req: any): string {
    const protocol = req.protocol || "http";
    const host = req.get ? req.get("host") : "localhost:4000";
    return `${protocol}://${host}`;
  }

  @Get("list")
  async list(
    @Query("folder_id") folderIdStr: string,
    @Query("view_in") viewIn = "all_media",
    @Query("page") page = "1",
    @Query("per_page") perPage = "30",
    @Query("sort_by") sortBy = "name-asc",
    @Query("filter") filter = "everything",
    @Query("search") search = "",
    @Req() req: any
  ) {
    const baseUrl = this.getBaseUrl(req);
    return this.mediaService.getMediaList(
      folderIdStr,
      viewIn,
      Number(page),
      Number(perPage),
      sortBy,
      filter,
      search,
      baseUrl
    );
  }

  @Post("folders")
  async createFolder(
    @Body("name") name: string,
    @Body("parent_id") parentIdStr: string | number,
    @Body("color") color?: string
  ) {
    return this.mediaService.createFolder(name, parentIdStr, color);
  }

  @Post("files/upload")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: any,
    @Body("folder_id") folderIdStr?: string | number,
    @Body("visibility") visibility?: string,
    @Body("access_mode") accessMode?: string
  ) {
    return this.mediaService.uploadFile(file, folderIdStr, visibility, accessMode);
  }

  @Post("files/download-url")
  async downloadUrl(
    @Body("url") url: string,
    @Body("folder_id") folderIdStr?: string | number,
    @Body("visibility") visibility?: string,
    @Body("access_mode") accessMode?: string
  ) {
    return this.mediaService.downloadUrl(url, folderIdStr, visibility, accessMode);
  }

  @Post("actions")
  async actions(
    @Body("action") action: MediaAction,
    @Body("selected") selected: any[],
    @Body("destination") destination?: string | number,
    @Body("color") color?: string,
    @Body("skip_trash") skipTrash?: boolean,
    @Body("imageId") imageId?: string,
    @Body("cropData") cropData?: any
  ) {
    return this.mediaService.performAction(
      action,
      selected,
      destination,
      color,
      skipTrash,
      imageId,
      cropData
    );
  }

  @Get("folders/tree")
  async folderTree() {
    return this.mediaService.getFolderTree();
  }

  @Get("options")
  async options() {
    return this.mediaService.getOptions();
  }
}
