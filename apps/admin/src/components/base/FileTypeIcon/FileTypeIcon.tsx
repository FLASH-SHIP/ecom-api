"use client";

import type { ReactNode } from "react";

// ── Types ───────────────────────────────────────────────────

interface FileTypeIconProps {
  className?: string;
  size?: number;
}

// ── Shared SVG Base ─────────────────────────────────────────

interface FileIconBaseProps {
  size: number;
  bgColor: string;
  foldColor: string;
  label?: string;
  children?: ReactNode;
}

/** Base file icon SVG — shared by all file type icons */
const FileIconBase = ({ size, bgColor, foldColor, label, children }: FileIconBaseProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M12 4h16l12 12v28a2 2 0 01-2 2H12a2 2 0 01-2-2V6a2 2 0 012-2z" fill={bgColor} />
    <path d="M28 4l12 12H30a2 2 0 01-2-2V4z" fill={foldColor} />
    {label ? (
      <text
        x="24"
        y="34"
        textAnchor="middle"
        fill="white"
        fontSize={label.length > 3 ? "8" : label.length > 2 ? "9" : "10"}
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        {label}
      </text>
    ) : null}
    {children}
  </svg>
);

// ── Icon Components ─────────────────────────────────────────

export const PdfIcon = ({ size = 48 }: FileTypeIconProps): ReactNode => (
  <FileIconBase size={size} bgColor="#E53E3E" foldColor="#FC8181" label="PDF" />
);

export const WordIcon = ({ size = 48 }: FileTypeIconProps): ReactNode => (
  <FileIconBase size={size} bgColor="#2B6CB0" foldColor="#63B3ED" label="DOC" />
);

export const ExcelIcon = ({ size = 48 }: FileTypeIconProps): ReactNode => (
  <FileIconBase size={size} bgColor="#276749" foldColor="#68D391" label="XLS" />
);

export const PptIcon = ({ size = 48 }: FileTypeIconProps): ReactNode => (
  <FileIconBase size={size} bgColor="#C05621" foldColor="#FBD38D" label="PPT" />
);

export const VideoIcon = ({ size = 48 }: FileTypeIconProps): ReactNode => (
  <FileIconBase size={size} bgColor="#6B46C1" foldColor="#B794F4">
    <polygon points="20,24 20,36 32,30" fill="white" />
  </FileIconBase>
);

export const AudioIcon = ({ size = 48 }: FileTypeIconProps): ReactNode => (
  <FileIconBase size={size} bgColor="#B83280" foldColor="#F687B3" label="MP3" />
);

export const ArchiveIcon = ({ size = 48 }: FileTypeIconProps): ReactNode => (
  <FileIconBase size={size} bgColor="#975A16" foldColor="#F6E05E" label="ZIP" />
);

export const CsvIcon = ({ size = 48 }: FileTypeIconProps): ReactNode => (
  <FileIconBase size={size} bgColor="#2F855A" foldColor="#9AE6B4" label="CSV" />
);

export const TextIcon = ({ size = 48 }: FileTypeIconProps): ReactNode => (
  <FileIconBase size={size} bgColor="#4A5568" foldColor="#A0AEC0" label="TXT" />
);

export const GenericFileIcon = ({ size = 48 }: FileTypeIconProps): ReactNode => (
  <FileIconBase size={size} bgColor="#718096" foldColor="#CBD5E0" label="FILE" />
);

// ── Resolver ────────────────────────────────────────────────

/**
 * Trả về component icon phù hợp dựa vào mime_type.
 * Mỗi loại file có màu sắc và label riêng để dễ phân biệt.
 */
export const getFileTypeIcon = (mimeType?: string, size = 48): ReactNode => {
  if (!mimeType) return <GenericFileIcon size={size} />;
  const m = mimeType.toLowerCase();

  // Video
  if (m.startsWith("video/")) return <VideoIcon size={size} />;
  // Audio
  if (m.startsWith("audio/")) return <AudioIcon size={size} />;
  // PDF
  if (m === "application/pdf") return <PdfIcon size={size} />;
  // Word
  if (
    m === "application/msword" ||
    m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return <WordIcon size={size} />;
  // Excel
  if (
    m === "application/vnd.ms-excel" ||
    m === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
    return <ExcelIcon size={size} />;
  // CSV
  if (m === "text/csv") return <CsvIcon size={size} />;
  // PowerPoint
  if (
    m === "application/vnd.ms-powerpoint" ||
    m === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  )
    return <PptIcon size={size} />;
  // Archive
  if (m === "application/zip" || m === "application/x-rar-compressed" || m === "application/x-rar")
    return <ArchiveIcon size={size} />;
  // Text
  if (m === "text/plain") return <TextIcon size={size} />;
  if (m.startsWith("text/")) return <TextIcon size={size} />;

  return <GenericFileIcon size={size} />;
};
