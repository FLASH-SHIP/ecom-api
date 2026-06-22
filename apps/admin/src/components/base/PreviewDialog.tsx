'use client';

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Download,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  RefreshCw,
} from 'lucide-react';

// ── Types (from model) ──────────────────────────────────────

import {
  OFFICE_EXTENSIONS,
  OFFICE_MIME_TYPES,
  type PreviewItem,
  type PreviewDialogProps,
  type FileCategory,
} from './PreviewDialog/model/preview.model';

export type { PreviewItem, PreviewDialogProps } from './PreviewDialog/model/preview.model';

/** Extract file extension from name, downloadUrl, or url (in that priority order for last resort) */
function getExtension(item: PreviewItem): string {
  // Try name first (must be alphanumeric, max 5 chars — avoids "MS - EXCEL NEW" from "3. MS - EXCEL NEW")
  const nameExt = item.name.split('.').pop()?.toLowerCase().trim() ?? '';
  if (nameExt !== item.name.toLowerCase() && /^[a-z\d]{1,5}$/.test(nameExt)) return nameExt;

  // Try downloadUrl
  if (item.downloadUrl) {
    const urlPath = new URL(item.downloadUrl, 'https://x').pathname;
    const urlExt = urlPath.split('.').pop()?.toLowerCase() ?? '';
    if (urlExt.length > 0 && urlExt.length <= 5) return urlExt;
  }

  // Try url
  try {
    const urlPath = new URL(item.url, 'https://x').pathname;
    const urlExt = urlPath.split('.').pop()?.toLowerCase() ?? '';
    if (urlExt.length > 0 && urlExt.length <= 5) return urlExt;
  } catch {
    /* ignore */
  }

  return '';
}

function getFileCategory(item: PreviewItem): FileCategory {
  const ext = getExtension(item);
  const mime = item.mimeType?.toLowerCase() ?? '';

  // 1. Office — check BOTH extension and MIME first (highest priority)
  if (OFFICE_EXTENSIONS.includes(ext)) return 'office';
  if (OFFICE_MIME_TYPES.includes(mime)) return 'office';

  // 2. PDF
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';

  // 3. Image
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
  if (mime.startsWith('image/')) return 'image';

  // 4. Video
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video';
  if (mime.startsWith('video/')) return 'video';

  // 5. Audio
  if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext)) return 'audio';
  if (mime.startsWith('audio/')) return 'audio';

  return 'other';
}

// ── Renderers ──────────────────────────────────────────────

function ImagePreview({ item }: { item: PreviewItem }): ReactNode {
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const isZoomed = scale > 1;

  // Reset transforms when item changes
  useEffect(() => {
    setScale(1);
    setRotate(0);
    setFlipX(false);
    setFlipY(false);
    setPos({ x: 0, y: 0 });
  }, [item.url]);

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => {
      const next = Math.max(s - 0.5, 1);
      if (next <= 1) setPos({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setRotate(0);
    setFlipX(false);
    setFlipY(false);
    setPos({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setScale((s) => Math.min(s + 0.25, 5));
      } else {
        setScale((s) => {
          const next = Math.max(s - 0.25, 1);
          if (next <= 1) setPos({ x: 0, y: 0 });
          return next;
        });
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Drag handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isZoomed) return;
      e.preventDefault();
      dragging.current = true;
      dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    },
    [isZoomed, pos],
  );

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    setPos({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }, []);

  const onMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const transform = [
    `translate(${pos.x}px, ${pos.y}px)`,
    `scale(${flipX ? -scale : scale}, ${flipY ? -scale : scale})`,
    `rotate(${rotate}deg)`,
  ].join(' ');

  const toolbarBtns: { icon: ReactNode; label: string; onClick: () => void }[] = [
    {
      icon: <FlipHorizontal className="h-4 w-4" />,
      label: 'Flip horizontal',
      onClick: () => setFlipX((v) => !v),
    },
    {
      icon: <FlipVertical className="h-4 w-4" />,
      label: 'Flip vertical',
      onClick: () => setFlipY((v) => !v),
    },
    {
      icon: <RotateCcw className="h-4 w-4" />,
      label: 'Rotate left',
      onClick: () => setRotate((r) => r - 90),
    },
    {
      icon: <RotateCw className="h-4 w-4" />,
      label: 'Rotate right',
      onClick: () => setRotate((r) => r + 90),
    },
    {
      icon: <ZoomOut className="h-4 w-4" />,
      label: 'Zoom out',
      onClick: handleZoomOut,
    },
    {
      icon: <ZoomIn className="h-4 w-4" />,
      label: 'Zoom in',
      onClick: handleZoomIn,
    },
    {
      icon: <RefreshCw className="h-4 w-4" />,
      label: 'Reset',
      onClick: handleReset,
    },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Image container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{
          maxWidth: '90vw',
          maxHeight: '75vh',
          cursor: isZoomed ? (dragging.current ? 'grabbing' : 'grab') : 'default',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <img
          src={item.url}
          alt={item.name}
          className="select-none rounded"
          draggable={false}
          style={{
            transform,
            transition: dragging.current ? 'none' : 'transform 0.3s ease',
            transformOrigin: 'center center',
            maxHeight: '75vh',
            maxWidth: '90vw',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center gap-1 rounded-full px-3 py-2"
        style={{
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(0.5rem)',
        }}
      >
        {toolbarBtns.map((btn, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              btn.onClick();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white cursor-pointer"
            aria-label={btn.label}
            title={btn.label}
          >
            {btn.icon}
          </button>
        ))}
        {/* Scale indicator */}
        {scale !== 1 && (
          <span className="ml-1 text-xs text-white/60 select-none">{Math.round(scale * 100)}%</span>
        )}
      </div>
    </div>
  );
}

function VideoPreview({ item }: { item: PreviewItem }): ReactNode {
  return (
    <video
      src={item.downloadUrl || item.url}
      controls
      autoPlay
      className="max-h-[85vh] max-w-[90vw] rounded"
      style={{ outline: 'none' }}
    >
      <track kind="captions" />
    </video>
  );
}

function AudioPreview({ item }: { item: PreviewItem }): ReactNode {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-white/10">
        <FileText className="h-16 w-16 text-white/70" />
      </div>
      <p className="max-w-md truncate text-lg font-medium text-white">{item.name}</p>
      <audio
        src={item.downloadUrl || item.url}
        controls
        autoPlay
        className="w-[25rem] max-w-[90vw]"
      >
        <track kind="captions" />
      </audio>
    </div>
  );
}

function PdfPreview({ item }: { item: PreviewItem }): ReactNode {
  return (
    <iframe
      src={item.downloadUrl || item.url}
      title={item.name}
      className="h-[85vh] w-[90vw] max-w-[75rem] rounded bg-white"
    />
  );
}

interface CellData {
  v: string;
  bg?: string;
  fg?: string;
  bold?: boolean;
  italic?: boolean;
}

function OfficePreview({ item }: { item: PreviewItem }): ReactNode {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Excel-specific state
  const [sheets, setSheets] = useState<{ name: string; data: CellData[][] }[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);

  const ext = getExtension(item);
  const isDocx = ['doc', 'docx'].includes(ext);
  const isXlsx = ['xls', 'xlsx'].includes(ext);
  const isPptx = ['ppt', 'pptx'].includes(ext);

  // PPTX-specific state
  const [pptxSlides, setPptxSlides] = useState<{ slideNumber: number; texts: string[] }[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      setLoading(true);
      setError(null);
      try {
        const fileUrl = item.downloadUrl || item.url;
        // Use server-side conversion API (avoids browser module resolution issues)
        const apiUrl = `/api/convert-doc?url=${encodeURIComponent(fileUrl)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

        if (data.type === 'docx' && !cancelled) {
          setHtml(data.html);
        } else if (data.type === 'xlsx' && !cancelled) {
          setSheets(data.sheets);
        } else if (data.type === 'pptx' && !cancelled) {
          setPptxSlides(data.slides);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load document');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (isDocx || isXlsx || isPptx) {
      loadDocument();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [item.url, item.downloadUrl, isDocx, isXlsx, isPptx]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        <p className="text-white/70 text-sm">Loading document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4">
        <FileText className="h-16 w-16 text-white/50" />
        <p className="text-white/70 text-sm">{error}</p>
        <a
          href={item.url}
          download={item.name}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-white transition-colors hover:bg-white/30"
        >
          <Download className="h-4 w-4" />
          Download instead
        </a>
      </div>
    );
  }

  // PPTX slide cards view
  if (isPptx && pptxSlides.length > 0) {
    return (
      <div className="h-[85vh] w-[90vw] max-w-[75rem] overflow-auto rounded bg-[#1e1e1e] p-6">
        <div className="mx-auto grid max-w-4xl gap-6">
          {pptxSlides.map((slide) => (
            <div key={slide.slideNumber} className="overflow-hidden rounded-lg bg-white shadow-lg">
              {/* Slide header */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #D35230 0%, #B7472A 100%)',
                  padding: '0.625rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 4,
                    padding: '0.125rem 0.5rem',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  Slide {slide.slideNumber}
                </span>
              </div>
              {/* Slide content */}
              <div style={{ padding: '1.5rem 2rem', minHeight: '7.5rem' }}>
                {slide.texts.length > 0 ? (
                  slide.texts.map((text, ti) => (
                    <p
                      key={ti}
                      style={{
                        margin: '0.5rem 0',
                        fontSize: ti === 0 ? 18 : 14,
                        fontWeight: ti === 0 ? 600 : 400,
                        color: ti === 0 ? '#1a1a1a' : '#444',
                        lineHeight: 1.6,
                      }}
                    >
                      {text}
                    </p>
                  ))
                ) : (
                  <p style={{ color: '#999', fontStyle: 'italic', fontSize: 14 }}>
                    (No text content on this slide)
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Excel sheet tab + table view
  if (isXlsx && sheets.length > 0) {
    const sheet = sheets[activeSheet];
    const maxCols = sheet?.data.reduce((max, row) => Math.max(max, row.length), 0) ?? 0;
    const colLetter = (i: number) => {
      let s = '';
      let n = i;
      while (n >= 0) {
        s = String.fromCharCode((n % 26) + 65) + s;
        n = Math.floor(n / 26) - 1;
      }
      return s;
    };

    return (
      <div className="flex h-[85vh] w-[90vw] max-w-[75rem] flex-col rounded bg-white overflow-hidden">
        {/* Spreadsheet grid */}
        <div className="flex-1 overflow-auto">
          <table
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              fontSize: '0.8125rem',
              fontFamily: 'Calibri, Arial, sans-serif',
            }}
          >
            {/* Column headers A, B, C... */}
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <th
                  style={{
                    minWidth: 40,
                    background: '#f0f0f0',
                    border: '0.0625rem solid #d4d4d4',
                    padding: '0.25rem 0.375rem',
                    fontWeight: 600,
                    color: '#555',
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                  }}
                />
                {Array.from({ length: maxCols }, (_, i) => (
                  <th
                    key={i}
                    style={{
                      minWidth: 80,
                      background: '#f0f0f0',
                      border: '0.0625rem solid #d4d4d4',
                      padding: '0.25rem 0.5rem',
                      fontWeight: 600,
                      color: '#555',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {colLetter(i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet?.data.map((row, rIdx) => (
                <tr key={rIdx}>
                  {/* Row number */}
                  <td
                    style={{
                      minWidth: 40,
                      background: '#f0f0f0',
                      border: '0.0625rem solid #d4d4d4',
                      padding: '0.25rem 0.375rem',
                      fontWeight: 600,
                      color: '#555',
                      textAlign: 'center',
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                    }}
                  >
                    {rIdx + 1}
                  </td>
                  {Array.from({ length: maxCols }, (_, cIdx) => {
                    const cell = row[cIdx] ?? { v: '' };
                    return (
                      <td
                        key={cIdx}
                        style={{
                          border: '0.0625rem solid #e0e0e0',
                          padding: '0.25rem 0.5rem',
                          whiteSpace: 'nowrap',
                          maxWidth: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          backgroundColor: cell.bg || (rIdx % 2 === 0 ? '#fff' : '#f8f9fa'),
                          color: cell.fg || undefined,
                          fontWeight: cell.bold ? 700 : undefined,
                          fontStyle: cell.italic ? 'italic' : undefined,
                        }}
                      >
                        {cell.v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sheet tabs */}
        {sheets.length > 1 && (
          <div
            style={{
              display: 'flex',
              borderTop: '0.0625rem solid #d4d4d4',
              background: '#f0f0f0',
              overflowX: 'auto',
            }}
          >
            {sheets.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSheet(idx)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.75rem',
                  fontWeight: idx === activeSheet ? 600 : 400,
                  background: idx === activeSheet ? '#fff' : 'transparent',
                  border: 'none',
                  borderRight: '0.0625rem solid #d4d4d4',
                  borderTop:
                    idx === activeSheet ? '0.125rem solid #217346' : '0.125rem solid transparent',
                  color: idx === activeSheet ? '#217346' : '#555',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Docx / generic HTML view
  return (
    <div
      className="h-[85vh] w-[90vw] max-w-[75rem] overflow-auto rounded bg-white p-8"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ fontSize: '0.875rem', lineHeight: '1.6' }}
    />
  );
}

function FallbackPreview({ item }: { item: PreviewItem }): ReactNode {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-white/10">
        <FileText className="h-16 w-16 text-white/70" />
      </div>
      <p className="max-w-md truncate text-lg font-medium text-white">{item.name}</p>
      <a
        href={item.url}
        download={item.name}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-white transition-colors hover:bg-white/30"
      >
        <Download className="h-4 w-4" />
        Download file
      </a>
    </div>
  );
}

function PreviewContent({ item }: { item: PreviewItem }): ReactNode {
  const cat = getFileCategory(item);
  switch (cat) {
    case 'image':
      return <ImagePreview item={item} />;
    case 'video':
      return <VideoPreview item={item} />;
    case 'audio':
      return <AudioPreview item={item} />;
    case 'pdf':
      return <PdfPreview item={item} />;
    case 'office':
      return <OfficePreview item={item} />;
    default:
      return <FallbackPreview item={item} />;
  }
}

// ── Main Component ─────────────────────────────────────────

export default function PreviewDialog({
  open,
  onOpenChange,
  items,
  initialIndex = 0,
}: PreviewDialogProps): ReactNode {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const count = items.length;
  const hasMultiple = count > 1;

  // Reset index when items/open change
  useEffect(() => {
    if (open) {
      setCurrentIndex(Math.min(initialIndex, Math.max(0, count - 1)));
    }
  }, [open, initialIndex, count]);

  const currentItem = useMemo(() => items[currentIndex] ?? null, [items, currentIndex]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : count - 1));
  }, [count]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i < count - 1 ? i + 1 : 0));
  }, [count]);

  const close = useCallback(() => {
    onOpenChange(false);
    setIsFullscreen(false);
  }, [onOpenChange]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasMultiple) {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight' && hasMultiple) {
        e.preventDefault();
        goNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, hasMultiple, goPrev, goNext, close]);

  // Clean up fullscreen on unmount/close
  useEffect(() => {
    if (!open && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, [open]);

  if (!open || !currentItem) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
        {/* Counter */}
        <div className="text-white/80 text-sm font-medium select-none">
          {hasMultiple ? `${currentIndex + 1} / ${count}` : ''}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Left arrow */}
      {hasMultiple ? (
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 z-10 cursor-pointer"
          aria-label="Previous"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      ) : null}

      {/* Content */}
      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <PreviewContent item={currentItem} />
      </div>

      {/* Right arrow */}
      {hasMultiple ? (
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 z-10 cursor-pointer"
          aria-label="Next"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      ) : null}

      {/* File name at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
        <p className="text-white/70 text-sm truncate max-w-lg mx-auto">{currentItem.name}</p>
      </div>

      {/* Click backdrop to close */}
      <div className="absolute inset-0 -z-10" onClick={close} />
    </div>
  );
}
