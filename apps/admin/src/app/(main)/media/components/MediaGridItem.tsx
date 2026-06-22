'use client';

import { ReactNode } from 'react';
import { MediaItemType } from '../model/media.model';
import type { MediaItem, MediaGridItemProps, MediaGridBackItemProps } from '../model/media.model';
import { Folder, Undo2, Check } from 'lucide-react';
import Image from 'next/image';
import { getFileTypeIcon } from '@admin/components/base/FileTypeIcon/FileTypeIcon';

/** Check xem mime_type có phải image không */
const isImageMime = (mimeType?: string): boolean => {
  if (!mimeType) return false;
  return mimeType.toLowerCase().startsWith('image/');
};

/** Render thumbnail: folder → icon, ảnh → next/image, file khác → custom SVG icon */
const renderThumbnail = (item: MediaItem): ReactNode => {
  if (item.type === MediaItemType.FOLDER) {
    return (
      <Folder
        className={item.color ? 'size-12' : 'size-12 text-muted-foreground'}
        style={item.color ? { color: item.color } : undefined}
      />
    );
  }

  const imgSrc = item.preview_url || item.full_url || item.thumbnailUrl;
  if (imgSrc && isImageMime(item.mime_type)) {
    return (
      <Image
        src={imgSrc}
        alt={item.name}
        fill
        sizes="90px"
        unoptimized
        className="object-contain rounded"
      />
    );
  }

  return getFileTypeIcon(item.mime_type, 48);
};

const MediaGridItem = ({
  item,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu,
}: MediaGridItemProps): ReactNode => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        // Cmd (macOS) hoặc Ctrl (Windows) + click → multi-select
        const isMulti = e.metaKey || e.ctrlKey;
        onClick(item, isMulti);
      }}
      onDoubleClick={() => onDoubleClick(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onDoubleClick(item);
      }}
      className={`
        relative group flex flex-col items-center justify-center gap-1.5
        w-full h-[8.5rem] rounded-lg border cursor-pointer
        transition-all select-none
        ${
          isSelected
            ? 'border-primary bg-primary/5 ring-1 ring-primary'
            : 'border-transparent hover:bg-accent/50'
        }
      `}
    >
      {/* `rendering-conditional-render` — ternary */}
      {isSelected ? (
        <span className="absolute top-1.5 right-1.5 size-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="size-3 text-primary-foreground" />
        </span>
      ) : null}

      <div className="relative flex items-center justify-center w-[4.5rem] h-[4.5rem]">
        {renderThumbnail(item)}
      </div>

      {/* Name */}
      <span
        className="text-xs text-center truncate max-w-[8.75rem] px-1"
        style={{ color: 'var(--admin-text-color)' }}
      >
        {item.name}
      </span>
    </div>
  );
};

export default MediaGridItem;

// ── Back item (go up folder) ──────────────────────────────────

export const MediaGridBackItem = ({ onClick }: MediaGridBackItemProps): ReactNode => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
      className="flex flex-col items-center justify-center gap-1.5 w-full h-[8.5rem] rounded-lg border border-transparent hover:bg-accent/50 cursor-pointer transition-all select-none"
    >
      <div className="flex items-center justify-center w-[4.5rem] h-[4.5rem]">
        <Undo2 className="size-12" style={{ color: 'var(--admin-text-color)' }} />
      </div>
      <span className="text-xs text-center" style={{ color: 'var(--admin-text-color)' }}>
        ...
      </span>
    </div>
  );
};
