import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { slugify } from "@flash-ship/ecom-lib/slugify";
import type { MediaFolderRepository } from "../repositories/MediaFolderRepository";

interface IMediaFolderServiceDeps {
  folderRepo: MediaFolderRepository;
}

export class MediaFolderService {
  private deps: IMediaFolderServiceDeps;
  constructor(deps: IMediaFolderServiceDeps) {
    this.deps = deps;
  }

  async listFolders(options?: { parentId?: number | null; search?: string }) {
    return this.deps.folderRepo.findMany(options);
  }

  async getFolder(id: number) {
    const folder = await this.deps.folderRepo.findByIdWithChildren(id);
    if (!folder) throw ErrorWithCode.Factory.NotFound("Folder not found");
    return folder;
  }

  async getFolderTree() {
    return this.deps.folderRepo.findTree();
  }

  async createFolder(data: { name: string; slug?: string; parentId?: number | null }) {
    const slug = data.slug || slugify(data.name);

    // Validate parent exists if provided
    if (data.parentId) {
      const parent = await this.deps.folderRepo.findById(data.parentId);
      if (!parent) throw ErrorWithCode.Factory.NotFound("Parent folder not found");
    }

    return this.deps.folderRepo.create({ name: data.name, slug, parentId: data.parentId });
  }

  async updateFolder(id: number, data: { name?: string; slug?: string; parentId?: number | null }) {
    const existing = await this.deps.folderRepo.findById(id);
    if (!existing) throw ErrorWithCode.Factory.NotFound("Folder not found");

    // Prevent circular reference
    if (data.parentId === id) {
      throw ErrorWithCode.Factory.BadRequest("A folder cannot be its own parent");
    }

    const updateData: { name?: string; slug?: string; parentId?: number | null } = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
      if (!data.slug) {
        updateData.slug = slugify(data.name);
      }
    }

    if (data.slug !== undefined) {
      updateData.slug = data.slug;
    }

    if (data.parentId !== undefined) {
      updateData.parentId = data.parentId;
    }

    return this.deps.folderRepo.update(id, updateData);
  }

  async deleteFolder(id: number, force = false) {
    const existing = await this.deps.folderRepo.findById(id);
    if (!existing) throw ErrorWithCode.Factory.NotFound("Folder not found");

    if (!force) {
      const hasChildren = await this.deps.folderRepo.hasChildren(id);
      if (hasChildren) {
        throw ErrorWithCode.Factory.BadRequest(
          "Folder has subfolders. Move or delete them first, or use force delete.",
        );
      }

      const hasFiles = await this.deps.folderRepo.hasFiles(id);
      if (hasFiles) {
        throw ErrorWithCode.Factory.BadRequest(
          "Folder contains files. Move or delete them first, or use force delete.",
        );
      }
    }

    return this.deps.folderRepo.delete(id);
  }
}
