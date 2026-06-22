import type { LucideIcon } from 'lucide-react';
import type { MouseEvent } from 'react';

// ── Item Types ──────────────────────────────────────────────
export enum MediaItemType {
  FOLDER = 'folder',
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

/**
 * Filter enum for MediaPickerDialog — controls which file types are shown.
 * Pass to MediaPickerDialog / MediaContent to restrict visible files.
 */
export enum MediaPickerFilter {
  /** Show all files (no filtering) */
  ALL = 'all',
  /** Only image files (image/*) */
  IMAGE = 'image',
  /** Only video files (video/*) */
  VIDEO = 'video',
  /** Only audio files (audio/*) */
  AUDIO = 'audio',
  /** Only document files (pdf, doc, docx, txt) */
  DOCUMENT = 'document',
  /** Only spreadsheet files (csv, xls, xlsx) */
  SPREADSHEET = 'spreadsheet',
}

/**
 * MIME prefix/match map for each MediaPickerFilter.
 * Used by MediaContent to filter fileItems by mime_type.
 */
export const MEDIA_PICKER_MIME_MAP: Record<MediaPickerFilter, string[]> = {
  [MediaPickerFilter.ALL]: [],
  [MediaPickerFilter.IMAGE]: ['image/'],
  [MediaPickerFilter.VIDEO]: ['video/'],
  [MediaPickerFilter.AUDIO]: ['audio/'],
  [MediaPickerFilter.DOCUMENT]: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  [MediaPickerFilter.SPREADSHEET]: [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

export interface MediaItem {
  /** Composite unique key: `${type}:${id}` — luôn duy nhất */
  _uid: string;
  id: string;
  name: string;
  type: MediaItemType;
  /** Human-readable file size, e.g. "1.96 MB" */
  size?: string;
  /** Full URL of the file (for display / copy) */
  full_url?: string;
  /** Thumbnail / preview URL */
  thumbnailUrl?: string;
  /** Alt text for images */
  alt?: string | null;
  /** MIME type, e.g. "image/png" */
  mime_type?: string;
  /** Basename, e.g. "image.png" */
  basename?: string;
  /** Preview URL from the API */
  preview_url?: string;
  /** Indirect URL from the API */
  indirect_url?: string;
  /** ISO date string */
  created_at: string;
  /** ISO date string */
  updated_at: string;
  /** Folder color (only for folders) */
  color?: string;
}

// ── View Mode ───────────────────────────────────────────────
export enum ViewMode {
  GRID = 'grid',
  LIST = 'list',
}

// ── Sort ────────────────────────────────────────────────────
export interface SortOption {
  label: string;
  value: string;
  icon: LucideIcon;
}

// ── Breadcrumb ──────────────────────────────────────────────
export interface BreadcrumbSegment {
  label: string;
  /** Folder id: 0 for root, folder id string for sub-folders */
  folderId: number | string;
}

// ── Upload API ──────────────────────────────────────────────

/** Payload for POST /v1/media/files/upload (multipart/form-data) */
export interface ParamsUploadMediaFile {
  /** The file to upload */
  file: File;
  /** Folder id to upload into */
  folder_id?: string;
  /** Visibility: public | private */
  visibility?: string;
  /** Access mode: signed, etc. */
  access_mode?: string;
  /** Custom file name */
  filename?: string;
  /** Chunk UUID (for chunked upload) */
  dzuuid?: string;
  /** Chunk index */
  dzchunkindex?: string;
  /** Total chunk count */
  dztotalchunkcount?: string;
  /** Total file size */
  dztotalfilesize?: string;
  /** Chunk size */
  dzchunksize?: string;
}

/** Payload for POST /v1/media/files/download-url */
export interface ParamsDownloadMediaFromRemote {
  /** Remote URL to download */
  url: string;
  /** Folder id to upload into */
  folder_id?: string;
  /** Visibility: public | private */
  visibility?: string;
  /** Access mode: signed, etc. */
  access_mode?: string;
}

/** Generic API response for media upload / download */
export interface MediaUploadResponse {
  data?: MediaItem | MediaItem[];
  message?: string;
  error?: boolean;
}

// ── List Media API ──────────────────────────────────────────

/** Query params for GET /v1/media/list */
export interface ParamsGetMediaList {
  folder_id?: number | string;
  view_in?: 'all_media' | 'trash' | 'recent' | 'favorites';
  page?: number;
  per_page?: number;
  sort_by?: string;
  filter?: string;
  search?: string;
}

/** A single file item from the API response */
export interface MediaFileItem {
  id: string;
  name: string;
  basename: string;
  url: string;
  full_url: string;
  type: string;
  thumb: string | null;
  /** Size as human-readable string, e.g. "1.96 MB" */
  size: string;
  mime_type: string;
  created_at: string;
  updated_at: string;
  options: {
    original_name?: string;
    original_url?: string;
  };
  folder_id: number;
  preview_url: string;
  preview_type: string;
  indirect_url: string;
  alt: string | null;
  visibility: string;
  access_mode: string | null;
}

/** A single folder item from the API response */
export interface MediaFolderItem {
  id: string | number;
  name: string;
  color?: string;
  slug?: string;
  parent_id?: number;
  created_at?: string;
  updated_at?: string;
}

/** Breadcrumb item from the API response */
export interface MediaBreadcrumbItem {
  id: number;
  name: string;
}

/** Pagination info from the API response */
export interface MediaPagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

/** Full response from GET /v1/media/list */
export interface MediaListResponse {
  data: {
    files: MediaFileItem[];
    folders: MediaFolderItem[];
    breadcrumbs: MediaBreadcrumbItem[];
    pagination: MediaPagination;
    selected_file_id: string | null;
  };
}

// ── Create Folder API ───────────────────────────────────────

/** Payload for POST /v1/media/folders */
export interface ParamsCreateMediaFolder {
  /** Tên folder */
  name: string;
  /** Parent folder id: 0 = root, hoặc id folder cha */
  parent_id: number | string;
  /** Màu folder (hex), ví dụ "#e74c3c" */
  color?: string;
}

/** Response for POST /v1/media/folders */
export interface CreateMediaFolderResponse {
  data?: MediaFolderItem;
  message?: string;
  error?: boolean;
}

/** Props cho CreateFolderDialog */
export interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Parent folder id hiện tại (0 = root) */
  parentId: number | string;
}

// ── Media Option (toolbar dropdowns) ────────────────────────
export interface MediaOption {
  label: string;
  value: string;
  icon: LucideIcon;
}

// ── Breadcrumb Props ────────────────────────────────────────
export interface MediaBreadcrumbProps {
  segments: BreadcrumbSegment[];
  onNavigate: (index: number) => void;
}

// ── Toolbar Props ───────────────────────────────────────────
export interface MediaToolbarProps {
  breadcrumb: BreadcrumbSegment[];
  onBreadcrumbNavigate: (index: number) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedSort: SortOption;
  onSortChange: (option: SortOption) => void;
  selectedItems: MediaItem[];
  onTrashRequest?: (items: MediaItem[]) => void;
  onRenameRequest?: (items: MediaItem[]) => void;
  onAltTextRequest?: (items: MediaItem[]) => void;
  onShareRequest?: (items: MediaItem[]) => void;
  onMoveRequest?: (items: MediaItem[]) => void;
  onPreviewRequest?: (item: MediaItem, allItems?: MediaItem[]) => void;
  onCropRequest?: (item: MediaItem) => void;
  onMakeCopyRequest?: (items: MediaItem[]) => void;
  onFavoriteRequest?: (items: MediaItem[]) => void;
  onRestoreRequest?: (items: MediaItem[]) => void;
  onDeletePermanentlyRequest?: (items: MediaItem[]) => void;
  onOpenFolder?: (item: MediaItem) => void;
  /** Current view filter */
  viewIn?: 'all_media' | 'trash' | 'recent' | 'favorites';
  /** Whether the detail sidebar is visible */
  showSidebar?: boolean;
  /** Toggle detail sidebar visibility */
  onToggleSidebar?: () => void;
  /** Whether the media page is in fullscreen mode */
  isFullscreen?: boolean;
  /** Toggle fullscreen mode */
  onToggleFullscreen?: () => void;
}

// ── Grid / List Item Props ──────────────────────────────────
export interface MediaGridItemProps {
  item: MediaItem;
  isSelected: boolean;
  onClick: (item: MediaItem, multi?: boolean) => void;
  onDoubleClick: (item: MediaItem) => void;
  onContextMenu: (e: MouseEvent, item: MediaItem) => void;
}

export interface MediaGridBackItemProps {
  onClick: () => void;
}

export interface MediaListItemProps {
  item: MediaItem;
  isSelected: boolean;
  onClick: (item: MediaItem, multi?: boolean) => void;
  onDoubleClick: (item: MediaItem) => void;
  onContextMenu: (e: MouseEvent, item: MediaItem) => void;
}

export interface MediaListBackItemProps {
  onClick: () => void;
}

// ── Grid / List View Props ──────────────────────────────────
export interface MediaGridProps {
  folders: MediaItem[];
  files: MediaItem[];
  selectedItems: MediaItem[];
  showBackButton: boolean;
  onSelect: (item: MediaItem, multi?: boolean) => void;
  onOpen: (item: MediaItem) => void;
  onBack: () => void;
  onContextMenu: (e: MouseEvent, item: MediaItem) => void;
}

export interface MediaListProps {
  folders: MediaItem[];
  files: MediaItem[];
  selectedItems: MediaItem[];
  showBackButton: boolean;
  onSelect: (item: MediaItem, multi?: boolean) => void;
  onOpen: (item: MediaItem) => void;
  onBack: () => void;
  onContextMenu: (e: MouseEvent, item: MediaItem) => void;
}

// ── Context Menu ────────────────────────────────────────────
export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface MediaContextMenuProps {
  item: MediaItem;
  selectedItems: MediaItem[];
  position: ContextMenuPosition;
  onClose: () => void;
  /** Current view filter — determines which actions are shown */
  viewIn?: 'all_media' | 'trash' | 'recent' | 'favorites';
  /** Callback khi user chọn "Preview" */
  onPreviewRequest?: (item: MediaItem, allItems?: MediaItem[]) => void;
  /** Callback khi user chọn "Move to trash" — parent sẽ show confirm modal */
  onTrashRequest?: (items: MediaItem[]) => void;
  /** Callback khi user chọn "Rename" — parent sẽ show rename dialog */
  onRenameRequest?: (items: MediaItem[]) => void;
  /** Callback khi user chọn "ALT text" — parent sẽ show alt text dialog */
  onAltTextRequest?: (items: MediaItem[]) => void;
  /** Callback khi user chọn "Share" — parent sẽ show share dialog */
  onShareRequest?: (items: MediaItem[]) => void;
  /** Callback khi user chọn "Move" — parent sẽ show move dialog */
  onMoveRequest?: (items: MediaItem[]) => void;
  /** Callback khi user chọn "Properties" — parent sẽ show properties dialog */
  onPropertiesRequest?: (items: MediaItem[]) => void;
  /** Callback khi user chọn "Crop" — parent sẽ show crop dialog */
  onCropRequest?: (item: MediaItem) => void;
  /** Callback khi user chọn "Make a copy" — parent sẽ gọi API trực tiếp */
  onMakeCopyRequest?: (items: MediaItem[]) => void;
  /** Callback khi user chọn "Add to favorite" / "Remove favorite" */
  onFavoriteRequest?: (items: MediaItem[]) => void;
  /** Callback khi user chọn "Restore" — parent sẽ gọi API trực tiếp */
  onRestoreRequest?: (items: MediaItem[]) => void;
  /** Callback khi user chọn "Delete permanently" — parent sẽ show confirm */
  onDeletePermanentlyRequest?: (items: MediaItem[]) => void;
  /** Callback khi user chọn "Open" folder — navigate into folder */
  onOpenFolder?: (item: MediaItem) => void;
}

export interface MenuAction {
  label: string;
  icon: LucideIcon;
  danger?: boolean;
  onClick: () => void;
}

export interface ContextMenuState {
  item: MediaItem;
  position: { x: number; y: number };
}

// ── Detail Sidebar ──────────────────────────────────────────
export interface MediaDetailSidebarProps {
  item: MediaItem | null;
}

// ── Upload Progress Panel ───────────────────────────────────
export enum UploadFileStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface UploadFileItem {
  id: string;
  file: File;
  status: UploadFileStatus;
  errorMessage?: string;
}

export interface UploadProgressPanelHandle {
  openPicker: () => void;
}

// ── Download URL Dialog ─────────────────────────────────────
export enum DownloadUrlStatus {
  PENDING = 'pending',
  DOWNLOADING = 'downloading',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface DownloadUrlItem {
  id: string;
  url: string;
  status: DownloadUrlStatus;
  errorMessage?: string;
}

export interface DownloadUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Media Actions (POST /v1/media/actions) ──────────────────

/** All available actions for context menu */
export enum MediaAction {
  TRASH = 'trash',
  RESTORE = 'restore',
  MOVE = 'move',
  MAKE_COPY = 'make_copy',
  DELETE = 'delete',
  FAVORITE = 'favorite',
  REMOVE_FAVORITE = 'remove_favorite',
  ADD_RECENT = 'add_recent',
  CROP = 'crop',
  RENAME = 'rename',
  ALT_TEXT = 'alt_text',
  EMPTY_TRASH = 'empty_trash',
  PROPERTIES = 'properties',
}

/** Crop data for image cropping */
export interface MediaCropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A single selected item in the action payload */
export interface MediaActionSelectedItem {
  /** File or folder ID */
  id: string;
  /** true if item is inside a folder (not root), false otherwise */
  is_folder?: boolean;
  /** Alt text (for 'alt_text' action) */
  alt?: string;
  /** New name (for 'rename' action) */
  name?: string;
  /** Whether to rename the physical file/folder on disk too */
  rename_physical_file?: boolean;
  /** Crop data as string (for 'crop' action) */
  cropData?: string;
  /** Full URL of file (for 'make_copy' action on files) */
  full_url?: string;
}

/** Payload for POST /v1/media/actions */
export interface ParamsMediaAction {
  /** Action type to perform */
  action: MediaAction;
  /** List of selected items to perform action on */
  selected: MediaActionSelectedItem[];
  /** Destination folder id (for 'move' action) */
  destination?: string | number;
  /** Image id (for specific image operations) */
  imageId?: string;
  /** Crop data array (for 'crop' action) */
  cropData?: MediaCropData;
  /** Color hex (for 'properties' action) */
  color?: string;
  /** Whether to skip trash (for 'delete' action) */
  skip_trash?: boolean;
}

/** Response from POST /v1/media/actions */
export interface MediaActionResponse {
  data?: unknown;
  message?: string;
  error?: boolean;
}

// ── Share Dialog ────────────────────────────────────────────
export enum ShareType {
  URL = 'url',
  INDIRECT_URL = 'indirect_url',
  HTML = 'html',
  MARKDOWN = 'markdown',
}

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MediaItem[];
}

// ── Move Dialog ────────────────────────────────────────────
export interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MediaItem[];
  onSubmit: (items: MediaItem[], destination: string | number) => void;
  loading?: boolean;
}

// ── Folder Tree API ─────────────────────────────────────────

/** A single node in the folder tree (recursive) */
export interface MediaFolderTreeItem {
  id: string;
  name: string;
  parent_id: number | string;
  children: MediaFolderTreeItem[];
  has_children: boolean;
}

/** Response from GET /v1/media/folders/tree */
export interface MediaFolderTreeResponse {
  data: {
    tree: MediaFolderTreeItem[];
  };
}

// ── Media Options API ───────────────────────────────────────

/** Response from GET /v1/media/options */
export interface MediaOptionsResponse {
  data: {
    folder_colors: string[];
  };
}

// ── Media Content Props ─────────────────────────────────────
export interface MediaContentProps {
  currentFolderId: number | string;
  onFolderChange: (folderId: number | string) => void;
  viewIn: 'all_media' | 'trash' | 'recent' | 'favorites';
  filter: string;
  search: string;
  /** Optional callback to track selected items (used by MediaPickerDialog) */
  onSelectionChange?: (items: MediaItem[]) => void;
  /** Filter files by media type. Defaults to ALL (no filtering) */
  mediaFilter?: MediaPickerFilter;
}
