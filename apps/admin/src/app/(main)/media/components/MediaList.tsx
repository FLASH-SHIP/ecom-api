"use client";

import { type ReactNode, useMemo } from "react";
import type { MediaListProps } from "../model/media.model";
import MediaListItem, { MediaListBackItem } from "./MediaListItem";

const MediaList = ({
  folders = [],
  files = [],
  selectedItems,
  showBackButton,
  onSelect,
  onOpen,
  onBack,
  onContextMenu,
}: MediaListProps): ReactNode => {
  // `js-set-map-lookups` — O(1) selected check
  const selectedUids = useMemo(() => new Set(selectedItems.map((s) => s._uid)), [selectedItems]);

  return (
    <div className="flex flex-col">
      {/* `rendering-conditional-render` — ternary */}
      {showBackButton ? <MediaListBackItem onClick={onBack} /> : null}

      {/* Folders */}
      {folders.map((item) => (
        <MediaListItem
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
        <MediaListItem
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

export default MediaList;
