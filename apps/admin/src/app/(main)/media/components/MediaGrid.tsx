'use client';

import { ReactNode, useMemo } from 'react';
import type { MediaGridProps } from '../model/media.model';
import MediaGridItem, { MediaGridBackItem } from './MediaGridItem';

const MediaGrid = ({
  folders = [],
  files = [],
  selectedItems,
  showBackButton,
  onSelect,
  onOpen,
  onBack,
  onContextMenu,
}: MediaGridProps): ReactNode => {
  // `js-set-map-lookups` — O(1) selected check
  const selectedUids = useMemo(() => new Set(selectedItems.map((s) => s._uid)), [selectedItems]);

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 p-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null as never);
      }}
    >
      {/* `rendering-conditional-render` — ternary */}
      {showBackButton ? <MediaGridBackItem onClick={onBack} /> : null}

      {/* Folders */}
      {folders.map((item) => (
        <MediaGridItem
          key={item._uid}
          item={item}
          isSelected={selectedUids.has(item._uid)}
          onClick={onSelect}
          onDoubleClick={onOpen}
          onContextMenu={onContextMenu}
        />
      ))}

      {/* Files */}
      {files.map((item) => (
        <MediaGridItem
          key={item._uid}
          item={item}
          isSelected={selectedUids.has(item._uid)}
          onClick={onSelect}
          onDoubleClick={onOpen}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
};

export default MediaGrid;
