'use client';

import { ReactNode, useState } from 'react';
import { ViewMode, MediaItemType } from '../model/media.model';
import type { SortOption, MediaToolbarProps, MediaItem } from '../model/media.model';
import { ButtonField } from './Compat';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@ecom/ui/components/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@ecom/ui/components/tooltip';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDown01,
  ArrowUp01,
  ChevronDown,
  Hand,
  LayoutGrid,
  List,
  Maximize,
  Minimize,
  PanelRight,
} from 'lucide-react';
import { showToast, ToastType } from '@admin/components/toast-provider';
import { downloadMultipleItemsAsZip } from '@admin/utils/func';
import { getMediaList } from '../api/queries';
import MediaBreadcrumb from './MediaBreadcrumb';
import { buildFolderActions, buildFileActions, buildTrashActions } from './MediaContextMenu';
import { useTranslations } from 'next-intl';

const MediaToolbar = ({
  breadcrumb,
  onBreadcrumbNavigate,
  viewMode,
  onViewModeChange,
  selectedSort,
  onSortChange,
  selectedItems,
  onTrashRequest,
  onRenameRequest,
  onAltTextRequest,
  onShareRequest,
  onMoveRequest,
  onPreviewRequest,
  onCropRequest,
  onMakeCopyRequest,
  onFavoriteRequest,
  onRestoreRequest,
  onDeletePermanentlyRequest,
  onOpenFolder,
  viewIn,
  showSidebar,
  onToggleSidebar,
  isFullscreen = false,
  onToggleFullscreen,
}: MediaToolbarProps): ReactNode => {
  const t = useTranslations('media');

  const SORT_OPTIONS: SortOption[] = [
    { label: t('fileNameAsc'), value: 'name-asc', icon: ArrowDownAZ },
    { label: t('media.fileNameDesc'), value: 'name-desc', icon: ArrowUpAZ },
    { label: t('uploadedDateAsc'), value: 'created_at-asc', icon: ArrowDown01 },
    { label: t('uploadedDateDesc'), value: 'created_at-desc', icon: ArrowUp01 },
    { label: t('sizeAsc'), value: 'size-asc', icon: ArrowDown01 },
    { label: t('sizeDesc'), value: 'size-desc', icon: ArrowUp01 },
  ];

  const [actionsOpen, setActionsOpen] = useState(false);

  const handleSortChange = (option: SortOption) => {
    onSortChange(option);
  };

  const closeActions = () => setActionsOpen(false);

  // Build actions — same logic as context menu
  const buildActions = () => {
    if (selectedItems.length === 0) return [];

    const activeItem = selectedItems[0];

    // Trash view: show trash-specific actions
    if (viewIn === 'trash') {
      let trashActions = buildTrashActions(
        activeItem,
        closeActions,
        onRenameRequest,
        onRestoreRequest,
        onDeletePermanentlyRequest,
        onPreviewRequest ? (item: MediaItem) => onPreviewRequest(item) : undefined,
        t,
      );
      if (selectedItems.length > 1) {
        const trashMultiOverrides: Record<string, () => void> = {
          Rename: () => {
            if (onRenameRequest) onRenameRequest(selectedItems);
            closeActions();
          },
          'Delete permanently': () => {
            if (onDeletePermanentlyRequest) onDeletePermanentlyRequest(selectedItems);
            closeActions();
          },
          Restore: () => {
            if (onRestoreRequest) onRestoreRequest(selectedItems);
            closeActions();
          },
        };
        trashActions = trashActions.map((a) =>
          trashMultiOverrides[a.label] ? { ...a, onClick: trashMultiOverrides[a.label] } : a,
        );
      }
      return trashActions;
    }

    let actions =
      activeItem.type === MediaItemType.FOLDER
        ? buildFolderActions(
            activeItem,
            closeActions,
            onTrashRequest,
            onRenameRequest,
            onAltTextRequest,
            onShareRequest,
            onMoveRequest,
            undefined,
            onMakeCopyRequest,
            onFavoriteRequest,
            onPreviewRequest ? (item: MediaItem) => onPreviewRequest(item) : undefined,
            onOpenFolder,
            t,
          )
        : buildFileActions(
            activeItem,
            closeActions,
            onTrashRequest,
            onRenameRequest,
            onAltTextRequest,
            onShareRequest,
            onMoveRequest,
            onCropRequest,
            onMakeCopyRequest,
            onFavoriteRequest,
            onPreviewRequest ? (item: MediaItem) => onPreviewRequest(item) : undefined,
            t,
          );

    if (selectedItems.length > 1) {
      // Multi-select overrides (same as context menu)
      const multiOverrides: Record<string, () => void> = {
        'Copy link': () => {
          const urls = selectedItems
            .map((si) => si.full_url)
            .filter(Boolean)
            .join(' ');
          if (urls) {
            navigator.clipboard.writeText(urls);
            showToast(ToastType.SUCCESS, `Copied ${selectedItems.length} links to clipboard`);
          }
          closeActions();
        },
        'Copy indirect link': () => {
          const urls = selectedItems
            .map((si) => si.indirect_url)
            .filter(Boolean)
            .join(' ');
          if (urls) {
            navigator.clipboard.writeText(urls);
            showToast(ToastType.SUCCESS, `Copied ${selectedItems.length} indirect links`);
          }
          closeActions();
        },
        Download: async () => {
          try {
            showToast(ToastType.INFO, `Preparing download ${selectedItems.length} items...`);
            await downloadMultipleItemsAsZip(
              selectedItems.map((si) => ({
                id: si.id,
                name: si.basename || si.name,
                type: si.type === MediaItemType.FOLDER ? 'folder' : 'file',
                full_url: si.full_url,
              })),
              async (folderId: string) => {
                const res = await getMediaList({
                  folder_id: folderId,
                  view_in: 'all_media',
                  per_page: 1000,
                });
                return (res?.data?.files || []).map((f) => ({
                  name: f.basename || f.name,
                  full_url: f.full_url,
                }));
              },
              'media-download',
            );
            showToast(ToastType.SUCCESS, t('downloadCompleted'));
          } catch {
            showToast(ToastType.ERROR, t('downloadFailed'));
          }
          closeActions();
        },
        'Move to trash': () => {
          if (onTrashRequest) onTrashRequest(selectedItems);
          closeActions();
        },
        Rename: () => {
          if (onRenameRequest) onRenameRequest(selectedItems);
          closeActions();
        },
        'ALT text': () => {
          if (onAltTextRequest) onAltTextRequest(selectedItems);
          closeActions();
        },
        Share: () => {
          if (onShareRequest) onShareRequest(selectedItems);
          closeActions();
        },
        Move: () => {
          if (onMoveRequest) onMoveRequest(selectedItems);
          closeActions();
        },
        'Make a copy': () => {
          if (onMakeCopyRequest) onMakeCopyRequest(selectedItems);
          closeActions();
        },
        'Add to favorite': () => {
          if (onFavoriteRequest) onFavoriteRequest(selectedItems);
          closeActions();
        },
      };

      actions = actions.map((a) =>
        multiOverrides[a.label] ? { ...a, onClick: multiOverrides[a.label] } : a,
      );
    }

    return actions;
  };

  const actionItems = buildActions();

  // `js-combine-iterations` — single pass for main/danger split
  const mainActions: typeof actionItems = [];
  const dangerActions: typeof actionItems = [];
  for (const a of actionItems) {
    (a.danger ? dangerActions : mainActions).push(a);
  }

  // Translate action labels for display
  const labelMap: Record<string, string> = {
    Preview: t('preview'),
    Rename: t('rename'),
    Download: t('download'),
    'Delete permanently': t('deletePermanently'),
    Restore: t('restore'),
    Open: t('open'),
    'Make a copy': t('ccreate'),
    Move: t('move'),
    'Add to favorite': t('favorites'),
    'Move to trash': t('moveToTrash'),
    Properties: t('properties'),
    Crop: 'Crop',
    'ALT text': t('altText'),
    'Copy link': t('copyLink'),
    'Copy indirect link': t('copyIndirectLink'),
    Share: t('share'),
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-3 px-3 md:px-[1rem] py-2 md:py-3 flex-wrap">
        {/* Left: Breadcrumb */}
        <div className="flex-1 min-w-0">
          <MediaBreadcrumb segments={breadcrumb} onNavigate={onBreadcrumbNavigate} />
        </div>

        {/* Right: Sort, Actions, View Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ButtonField
                variant="outline"
                className="h-[2.125rem] gap-1.5 cursor-pointer text-sm"
                style={{ color: 'var(--admin-text-color)' }}
              >
                <selectedSort.icon className="size-4" />
                {t('sort')}
                <ChevronDown className="size-3.5" />
              </ButtonField>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleSortChange(option)}
                  className={`gap-2 cursor-pointer ${
                    selectedSort.value === option.value ? 'text-primary font-medium' : ''
                  }`}
                >
                  <option.icon className="size-4" />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Actions Dropdown */}
          <DropdownMenu open={actionsOpen} onOpenChange={setActionsOpen}>
            <DropdownMenuTrigger asChild>
              <ButtonField
                variant="outline"
                className="h-[2.125rem] gap-1.5 text-sm"
                style={{ color: 'var(--admin-text-color)' }}
                disabled={selectedItems.length === 0}
              >
                <Hand className="size-4" />
                {t('actions')}
              </ButtonField>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[11.25rem]">
              {mainActions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  onClick={action.onClick}
                  className="gap-2 cursor-pointer"
                >
                  <action.icon className="size-4" />
                  {labelMap[action.label] ?? action.label}
                </DropdownMenuItem>
              ))}
              {dangerActions.length > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  {dangerActions.map((action) => (
                    <DropdownMenuItem
                      key={action.label}
                      onClick={action.onClick}
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <action.icon className="size-4" />
                      {labelMap[action.label] ?? action.label}
                    </DropdownMenuItem>
                  ))}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Toggle (Grid / List) */}
          <div className="flex items-center border border-input rounded-md overflow-hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <ButtonField
                  variant="ghost"
                  onClick={() => onViewModeChange(ViewMode.GRID)}
                  className={`h-[34px] w-[34px] p-1.5 transition-colors cursor-pointer rounded-none ${
                    viewMode === ViewMode.GRID ? 'text-white' : 'hover:bg-accent'
                  }`}
                  style={
                    viewMode === ViewMode.GRID
                      ? { backgroundColor: 'var(--admin-primary-color)' }
                      : undefined
                  }
                >
                  <LayoutGrid className="size-4" />
                </ButtonField>
              </TooltipTrigger>
              <TooltipContent>{t('gridView')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <ButtonField
                  variant="ghost"
                  onClick={() => onViewModeChange(ViewMode.LIST)}
                  className={`h-[34px] w-[34px] p-1.5 transition-colors cursor-pointer rounded-none ${
                    viewMode === ViewMode.LIST ? 'text-white' : 'hover:bg-accent'
                  }`}
                  style={
                    viewMode === ViewMode.LIST
                      ? { backgroundColor: 'var(--admin-primary-color)' }
                      : undefined
                  }
                >
                  <List className="size-4" />
                </ButtonField>
              </TooltipTrigger>
              <TooltipContent>{t('media.listView')}</TooltipContent>
            </Tooltip>
          </div>

          {/* Detail sidebar toggle */}
          <div className="flex items-center border border-input rounded-md overflow-hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <ButtonField
                  variant="ghost"
                  onClick={onToggleSidebar}
                  className={`h-[34px] w-[34px] p-1.5 transition-colors cursor-pointer rounded-none ${
                    showSidebar ? 'text-white' : 'hover:bg-accent'
                  }`}
                  style={
                    showSidebar ? { backgroundColor: 'var(--admin-primary-color)' } : undefined
                  }
                >
                  <PanelRight className="size-4" />
                </ButtonField>
              </TooltipTrigger>
              <TooltipContent>{t('media.toggleDetails')}</TooltipContent>
            </Tooltip>
          </div>

          {/* Fullscreen toggle */}
          {onToggleFullscreen && (
            <div className="flex items-center border border-input rounded-md overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <ButtonField
                    variant="ghost"
                    onClick={onToggleFullscreen}
                    className={`h-[34px] w-[34px] p-1.5 transition-colors cursor-pointer rounded-none ${
                      isFullscreen ? 'text-white' : 'hover:bg-accent'
                    }`}
                    style={
                      isFullscreen ? { backgroundColor: 'var(--admin-primary-color)' } : undefined
                    }
                  >
                    {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
                  </ButtonField>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? t('dataTable.exitFullscreen') : t('dataTable.enterFullscreen')}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default MediaToolbar;
