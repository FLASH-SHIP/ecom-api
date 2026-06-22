// ── Preview Item ────────────────────────────────────────────
export interface PreviewItem {
  /** URL to preview (preview_url for images, full_url for others) */
  url: string;
  /** Original file URL (full_url) — used for documents, audio, video */
  downloadUrl?: string;
  /** Display name */
  name: string;
  /** MIME type, e.g. "image/png", "video/mp4" */
  mimeType?: string;
}

// ── Dialog Props ────────────────────────────────────────────
export interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PreviewItem[];
  initialIndex?: number;
}

// ── File Category ───────────────────────────────────────────
export type FileCategory = 'image' | 'video' | 'audio' | 'pdf' | 'office' | 'other';

// ── Office Constants ────────────────────────────────────────
export const OFFICE_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

export const OFFICE_MIME_TYPES = [
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
