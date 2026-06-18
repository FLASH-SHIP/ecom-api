import { MediaFileRepository } from "@ecom/features/media/repositories/MediaFileRepository";
import { MediaFolderRepository } from "@ecom/features/media/repositories/MediaFolderRepository";
import { MediaFileService } from "@ecom/features/media/services/MediaFileService";
import { MediaFolderService } from "@ecom/features/media/services/MediaFolderService";
import type { IStorageAdapter } from "@ecom/features/media/storage/IStorageAdapter";
import { getStorageAdapter as createStorageAdapter } from "@ecom/features/media/storage/StorageFactory";
import { prisma } from "@ecom/prisma";

// Repositories
let _fileRepository: MediaFileRepository | null = null;
let _folderRepository: MediaFolderRepository | null = null;

// Storage
let _storageAdapter: IStorageAdapter | null = null;

// Services
let _fileService: MediaFileService | null = null;
let _folderService: MediaFolderService | null = null;

// ─── Repositories ───────────────────────────────────

export function getMediaFileRepository(): MediaFileRepository {
  if (!_fileRepository) {
    _fileRepository = new MediaFileRepository(prisma);
  }
  return _fileRepository;
}

export function getMediaFolderRepository(): MediaFolderRepository {
  if (!_folderRepository) {
    _folderRepository = new MediaFolderRepository(prisma);
  }
  return _folderRepository;
}

// ─── Storage ───────────────────────────────────────

export function getStorageAdapter(): IStorageAdapter {
  if (!_storageAdapter) {
    _storageAdapter = createStorageAdapter();
  }
  return _storageAdapter;
}

// ─── Services ───────────────────────────────────────

export function getMediaFileService(): MediaFileService {
  if (!_fileService) {
    _fileService = new MediaFileService({
      fileRepo: getMediaFileRepository(),
      storage: getStorageAdapter(),
    });
  }
  return _fileService;
}

export function getMediaFolderService(): MediaFolderService {
  if (!_folderService) {
    _folderService = new MediaFolderService({
      folderRepo: getMediaFolderRepository(),
    });
  }
  return _folderService;
}

export function resetMediaContainers(): void {
  _fileRepository = null;
  _folderRepository = null;
  _storageAdapter = null;
  _fileService = null;
  _folderService = null;
}
