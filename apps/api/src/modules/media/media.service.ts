import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import * as http from "node:http";
import * as https from "node:https";
import { extname, join } from "node:path";
import { prisma } from "@ecom/prisma";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export enum MediaAction {
  TRASH = "trash",
  RESTORE = "restore",
  MOVE = "move",
  MAKE_COPY = "make_copy",
  DELETE = "delete",
  FAVORITE = "favorite",
  REMOVE_FAVORITE = "remove_favorite",
  ADD_RECENT = "add_recent",
  CROP = "crop",
  RENAME = "rename",
  ALT_TEXT = "alt_text",
  EMPTY_TRASH = "empty_trash",
  PROPERTIES = "properties",
}

@Injectable()
export class MediaService {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  private getAdminUrl(): string {
    const adminUrl = this.configService.get<string>("ADMIN_URL") || "http://localhost:4001";
    return adminUrl.replace(/\/$/, "");
  }

  private getUploadsDir() {
    return join(__dirname, "../../../../admin/uploads");
  }

  private formatBytes(bytes: number, decimals = 2) {
    if (!bytes) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / k ** i).toFixed(dm)) + " " + sizes[i];
  }

  private getFileType(mimeType: string): string {
    const mime = mimeType?.toLowerCase() ?? "";
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    return "document";
  }

  private mapFileToItem(file: any, baseUrl: string) {
    const fileUrl = file.url.startsWith("http") ? file.url : `${baseUrl}${file.url}`;
    return {
      id: String(file.id),
      name: file.name,
      basename: file.fileName,
      url: file.url,
      full_url: fileUrl,
      type: this.getFileType(file.mimeType),
      thumb: file.mimeType.startsWith("image/") ? fileUrl : null,
      size: this.formatBytes(file.size),
      mime_type: file.mimeType,
      created_at: file.createdAt.toISOString(),
      updated_at: file.updatedAt.toISOString(),
      options: {},
      folder_id: file.folderId,
      preview_url: fileUrl,
      preview_type: file.mimeType,
      indirect_url: fileUrl,
      alt: file.alt,
      visibility: file.visibility,
      access_mode: file.accessMode,
    };
  }

  private mapFolderToItem(folder: any) {
    return {
      id: String(folder.id),
      name: folder.name,
      color: folder.color || undefined,
      slug: folder.slug,
      parent_id: folder.parentId || 0,
      created_at: folder.createdAt.toISOString(),
      updated_at: folder.updatedAt.toISOString(),
    };
  }

  async getMediaList(
    folderIdStr: string | number | undefined,
    viewIn: string,
    page = 1,
    perPage = 30,
    sortBy = "name-asc",
    filter = "everything",
    search = "",
    baseUrl?: string,
  ) {
    const folderId =
      folderIdStr && folderIdStr !== "0" && folderIdStr !== 0 ? Number(folderIdStr) : null;

    // ─── Order By ───────────────────────────────────────
    let orderBy: any = { createdAt: "desc" };
    if (sortBy) {
      const cleanSort = sortBy.replace(":", "-");
      const [field, order] = cleanSort.split("-");
      const mappedField = field === "created_at" || field === "uploaded_at" ? "createdAt" : field;
      const mappedOrder = order === "desc" || order === "asc" ? order : "desc";
      if (mappedField && ["name", "createdAt", "size"].includes(mappedField)) {
        orderBy = { [mappedField as string]: mappedOrder };
      }
    }

    // ─── Where Clause for Files ──────────────────────────
    const fileWhere: any = {};
    const folderWhere: any = {};

    // Soft delete status
    if (viewIn === "trash") {
      fileWhere.deletedAt = { not: null };
      folderWhere.deletedAt = { not: null };
    } else {
      fileWhere.deletedAt = null;
      folderWhere.deletedAt = null;
    }

    // Favorites & Recent
    if (viewIn === "favorites") {
      fileWhere.isFavorite = true;
      folderWhere.isFavorite = true;
    } else if (viewIn === "recent") {
      // Recent only queries files, no folders
      folderWhere.id = -1; // Force empty folders
    } else if (viewIn === "trash") {
      // Trash shows everything flat
    } else {
      // Regular folder browsing
      fileWhere.folderId = folderId;
      folderWhere.parentId = folderId;
    }

    // Type Filter (only applies to files)
    if (filter && filter !== "everything") {
      if (filter === "image") {
        fileWhere.mimeType = { startsWith: "image/" };
      } else if (filter === "video") {
        fileWhere.mimeType = { startsWith: "video/" };
      } else if (filter === "audio") {
        fileWhere.mimeType = { startsWith: "audio/" };
      } else if (filter === "document") {
        fileWhere.mimeType = {
          in: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
          ],
        };
      } else if (filter === "spreadsheet") {
        fileWhere.mimeType = {
          in: [
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ],
        };
      }
    }

    // Search Keyword
    if (search) {
      fileWhere.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { alt: { contains: search, mode: "insensitive" } },
      ];
      folderWhere.name = { contains: search, mode: "insensitive" };
    }

    // ─── Query Folders (fully returned) ────────────────────
    let folderResults: any[] = [];
    if (viewIn !== "recent") {
      const folders = await prisma.mediaFolder.findMany({
        where: folderWhere,
        orderBy: { name: "asc" },
      });
      folderResults = folders.map((f) => this.mapFolderToItem(f));
    }

    // ─── Query Files (paginated) ──────────────────────────
    const take = perPage;
    const skip = (page - 1) * perPage;

    const [files, totalFiles] = await Promise.all([
      prisma.mediaFile.findMany({
        where: fileWhere,
        orderBy,
        skip,
        take,
      }),
      prisma.mediaFile.count({ where: fileWhere }),
    ]);

    const fileResults = files.map((f) => this.mapFileToItem(f, baseUrl || this.getAdminUrl()));

    // ─── Breadcrumbs ─────────────────────────────────────
    const breadcrumbs = [{ id: 0, name: "All media" }];
    if (folderId) {
      let curr = await prisma.mediaFolder.findUnique({
        where: { id: folderId },
      });
      const list = [];
      while (curr) {
        list.unshift({ id: curr.id, name: curr.name });
        if (curr.parentId) {
          curr = await prisma.mediaFolder.findUnique({
            where: { id: curr.parentId },
          });
        } else {
          break;
        }
      }
      breadcrumbs.push(...list);
    }

    return {
      data: {
        files: fileResults,
        folders: folderResults,
        breadcrumbs,
        pagination: {
          total: totalFiles,
          per_page: perPage,
          current_page: page,
          last_page: Math.ceil(totalFiles / perPage) || 1,
        },
        selected_file_id: null,
      },
    };
  }

  async createFolder(name: string, parentIdStr: string | number, color?: string) {
    const parentId =
      parentIdStr && parentIdStr !== "0" && parentIdStr !== 0 ? Number(parentIdStr) : null;
    const slug =
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
      "-" +
      Math.random().toString(36).substring(2, 6);
    const folder = await prisma.mediaFolder.create({
      data: { name, slug, parentId, color },
    });
    return { data: this.mapFolderToItem(folder) };
  }

  async uploadFile(
    file: any,
    folderIdStr?: string | number,
    visibility = "public",
    accessMode?: string,
  ) {
    const folderId =
      folderIdStr && folderIdStr !== "0" && folderIdStr !== 0 ? Number(folderIdStr) : null;

    const uploadsDir = this.getUploadsDir();
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const dirPath = join(uploadsDir, year, month);

    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }

    const ext = extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}${ext}`;
    const filePath = join(dirPath, uniqueName);
    writeFileSync(filePath, file.buffer);

    const relativeUrl = `/uploads/${year}/${month}/${uniqueName}`;

    const created = await prisma.mediaFile.create({
      data: {
        name: file.originalname,
        fileName: uniqueName,
        mimeType: file.mimetype,
        size: file.size,
        url: relativeUrl,
        folderId,
        visibility,
        accessMode,
      },
    });

    return { data: this.mapFileToItem(created, this.getAdminUrl()) };
  }

  private downloadRemoteBuffer(
    url: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith("https") ? https : http;
      protocol
        .get(url, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to download: status ${res.statusCode}`));
            return;
          }

          const mimeType = res.headers["content-type"] || "application/octet-stream";
          const contentDisposition = res.headers["content-disposition"] || "";
          let filename = "downloaded-file";

          const match = contentDisposition.match(/filename="?([^";]+)"?/);
          if (match && match[1]) {
            filename = match[1];
          } else {
            const u = new URL(url);
            const parts = u.pathname.split("/");
            const lastPart = parts.pop();
            if (lastPart) filename = lastPart;
          }

          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            resolve({
              buffer: Buffer.concat(chunks),
              mimeType,
              filename,
            });
          });
        })
        .on("error", reject);
    });
  }

  async downloadUrl(
    url: string,
    folderIdStr?: string | number,
    visibility = "public",
    accessMode?: string,
  ) {
    const folderId =
      folderIdStr && folderIdStr !== "0" && folderIdStr !== 0 ? Number(folderIdStr) : null;

    const { buffer, mimeType, filename } = await this.downloadRemoteBuffer(url);

    const uploadsDir = this.getUploadsDir();
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const dirPath = join(uploadsDir, year, month);

    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }

    const ext = extname(filename) || ".bin";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}${ext}`;
    const filePath = join(dirPath, uniqueName);
    writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/${year}/${month}/${uniqueName}`;

    const created = await prisma.mediaFile.create({
      data: {
        name: filename,
        fileName: uniqueName,
        mimeType,
        size: buffer.length,
        url: relativeUrl,
        folderId,
        visibility,
        accessMode,
      },
    });

    return { data: this.mapFileToItem(created, this.getAdminUrl()) };
  }

  async performAction(
    action: MediaAction,
    selected: any[],
    destination?: string | number,
    color?: string,
    skipTrash?: boolean,
    imageId?: string,
    cropData?: any,
  ) {
    const ids = selected.map((s) => Number(s.id));
    const folderIds = selected.filter((s) => s.is_folder).map((s) => Number(s.id));
    const fileIds = selected.filter((s) => !s.is_folder).map((s) => Number(s.id));

    switch (action) {
      case MediaAction.TRASH:
        if (folderIds.length > 0) {
          await prisma.mediaFolder.updateMany({
            where: { id: { in: folderIds } },
            data: { deletedAt: new Date() },
          });
        }
        if (fileIds.length > 0) {
          await prisma.mediaFile.updateMany({
            where: { id: { in: fileIds } },
            data: { deletedAt: new Date() },
          });
        }
        break;

      case MediaAction.RESTORE:
        if (folderIds.length > 0) {
          await prisma.mediaFolder.updateMany({
            where: { id: { in: folderIds } },
            data: { deletedAt: null },
          });
        }
        if (fileIds.length > 0) {
          await prisma.mediaFile.updateMany({
            where: { id: { in: fileIds } },
            data: { deletedAt: null },
          });
        }
        break;

      case MediaAction.MOVE: {
        const destId =
          destination && destination !== "0" && destination !== 0 ? Number(destination) : null;
        if (folderIds.length > 0) {
          await prisma.mediaFolder.updateMany({
            where: { id: { in: folderIds } },
            data: { parentId: destId },
          });
        }
        if (fileIds.length > 0) {
          await prisma.mediaFile.updateMany({
            where: { id: { in: fileIds } },
            data: { folderId: destId },
          });
        }
        break;
      }

      case MediaAction.FAVORITE:
        if (folderIds.length > 0) {
          await prisma.mediaFolder.updateMany({
            where: { id: { in: folderIds } },
            data: { isFavorite: true },
          });
        }
        if (fileIds.length > 0) {
          await prisma.mediaFile.updateMany({
            where: { id: { in: fileIds } },
            data: { isFavorite: true },
          });
        }
        break;

      case MediaAction.REMOVE_FAVORITE:
        if (folderIds.length > 0) {
          await prisma.mediaFolder.updateMany({
            where: { id: { in: folderIds } },
            data: { isFavorite: false },
          });
        }
        if (fileIds.length > 0) {
          await prisma.mediaFile.updateMany({
            where: { id: { in: fileIds } },
            data: { isFavorite: false },
          });
        }
        break;

      case MediaAction.RENAME:
        for (const item of selected) {
          const itemId = Number(item.id);
          if (item.is_folder) {
            await prisma.mediaFolder.update({
              where: { id: itemId },
              data: { name: item.name },
            });
          } else {
            await prisma.mediaFile.update({
              where: { id: itemId },
              data: { name: item.name },
            });
          }
        }
        break;

      case MediaAction.ALT_TEXT:
        for (const item of selected) {
          const itemId = Number(item.id);
          await prisma.mediaFile.update({
            where: { id: itemId },
            data: { alt: item.alt },
          });
        }
        break;

      case MediaAction.PROPERTIES:
        if (ids.length > 0 && color) {
          await prisma.mediaFolder.updateMany({
            where: { id: { in: ids } },
            data: { color },
          });
        }
        break;

      case MediaAction.MAKE_COPY:
        for (const item of selected) {
          if (item.is_folder) continue; // Folders duplication not supported
          const file = await prisma.mediaFile.findUnique({
            where: { id: Number(item.id) },
          });
          if (!file) continue;

          // Copy file on disk
          const uploadsDir = this.getUploadsDir();
          const relativePath = file.url.replace("/uploads", "");
          const originalPath = join(uploadsDir, relativePath);

          if (existsSync(originalPath)) {
            const ext = extname(file.fileName);
            const copyFileName = `${Date.now()}-copy-${Math.random().toString(36).substring(2, 6)}${ext}`;
            const copyDir = originalPath.replace(file.fileName, "");
            const copyPath = join(copyDir, copyFileName);

            const fileBuffer = readFileSync(originalPath);
            writeFileSync(copyPath, fileBuffer);

            const yearMonth = file.url.replace("/uploads/", "").replace(file.fileName, "");
            const copyUrl = `/uploads/${yearMonth}${copyFileName}`;

            await prisma.mediaFile.create({
              data: {
                name: `Copy of ${file.name}`,
                fileName: copyFileName,
                mimeType: file.mimeType,
                size: file.size,
                url: copyUrl,
                folderId: file.folderId,
                visibility: file.visibility,
                accessMode: file.accessMode,
              },
            });
          }
        }
        break;

      case MediaAction.DELETE:
        // Delete permanently folders and files
        if (fileIds.length > 0) {
          const files = await prisma.mediaFile.findMany({
            where: { id: { in: fileIds } },
          });
          const uploadsDir = this.getUploadsDir();
          for (const f of files) {
            const relativePath = f.url.replace("/uploads", "");
            const fullPath = join(uploadsDir, relativePath);
            if (existsSync(fullPath)) {
              try {
                unlinkSync(fullPath);
              } catch {}
            }
          }
          await prisma.mediaFile.deleteMany({
            where: { id: { in: fileIds } },
          });
        }
        if (folderIds.length > 0) {
          await prisma.mediaFolder.deleteMany({
            where: { id: { in: folderIds } },
          });
        }
        break;

      case MediaAction.EMPTY_TRASH: {
        const trashedFiles = await prisma.mediaFile.findMany({
          where: { deletedAt: { not: null } },
        });
        const uploadsDir = this.getUploadsDir();
        for (const f of trashedFiles) {
          const relativePath = f.url.replace("/uploads", "");
          const fullPath = join(uploadsDir, relativePath);
          if (existsSync(fullPath)) {
            try {
              unlinkSync(fullPath);
            } catch {}
          }
        }
        await prisma.mediaFile.deleteMany({
          where: { deletedAt: { not: null } },
        });
        await prisma.mediaFolder.deleteMany({
          where: { deletedAt: { not: null } },
        });
        break;
      }

      case MediaAction.CROP:
        if (imageId && cropData) {
          const file = await prisma.mediaFile.findUnique({
            where: { id: Number(imageId) },
          });
          if (file) {
            try {
              const sharp = require("sharp");
              const uploadsDir = this.getUploadsDir();
              const relativePath = file.url.replace("/uploads", "");
              const imagePath = join(uploadsDir, relativePath);

              if (existsSync(imagePath)) {
                const buffer = readFileSync(imagePath);
                // cropData contains x, y, width, height
                const cropped = await sharp(buffer)
                  .extract({
                    left: Math.round(cropData.x),
                    top: Math.round(cropData.y),
                    width: Math.round(cropData.width),
                    height: Math.round(cropData.height),
                  })
                  .toBuffer();

                writeFileSync(imagePath, cropped);

                // Update size in DB
                await prisma.mediaFile.update({
                  where: { id: file.id },
                  data: {
                    size: cropped.length,
                    width: Math.round(cropData.width),
                    height: Math.round(cropData.height),
                  },
                });
              }
            } catch (err) {
              console.warn("Sharp crop failed:", err);
            }
          }
        }
        break;
    }

    return { message: "Action performed successfully" };
  }

  async getFolderTree() {
    const folders = await prisma.mediaFolder.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, parentId: true },
      orderBy: { name: "asc" },
    });

    const buildTree = (parentId: number | null): any[] => {
      return folders
        .filter((f) => f.parentId === parentId)
        .map((f) => {
          const children = buildTree(f.id);
          return {
            id: String(f.id),
            name: f.name,
            parent_id: f.parentId ?? 0,
            children,
            has_children: children.length > 0,
          };
        });
    };

    return { data: { tree: buildTree(null) } };
  }

  async getOptions() {
    return {
      data: {
        folder_colors: ["#4b6bfb", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6"],
      },
    };
  }
}
