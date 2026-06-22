'use client';

import React, { ReactNode, useRef, useState } from 'react';
import { ButtonField, InputField } from './Compat';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@ecom/ui/components/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@ecom/ui/components/tooltip';
import {
  Upload,
  FolderPlus,
  RefreshCw,
  Filter,
  Eye,
  Globe,
  Trash2,
  Clock,
  Star,
  Image,
  Video,
  FileText,
  Link,
  ChevronDown,
  FileArchive,
  Music,
  Search,
} from 'lucide-react';
import UploadProgressPanel from './UploadProgressPanel';
import DownloadUrlDialog from './DownloadUrlDialog';
import CreateFolderDialog from './CreateFolderDialog';
import type { MediaOption, UploadProgressPanelHandle } from '../model/media.model';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { MediaDataKeys } from '../api/queries';
import ConfirmDeleteModal from '@admin/components/layouts/ConfirmDeleteModal';
import { useTranslations } from 'next-intl';

interface ListButtonActionMediaProps {
  currentFolderId: number | string;
  selectedViewMedia: MediaOption;
  onViewMediaChange: (option: MediaOption) => void;
  selectedFilterType: MediaOption;
  onFilterTypeChange: (option: MediaOption) => void;
  onSearch: (keyword: string) => void;
  /** Current view filter */
  viewIn?: string;
  /** Callback to empty the trash */
  onEmptyTrash?: () => void;
  /** Whether the empty trash action is loading */
  emptyTrashLoading?: boolean;
}

const ListButtonActionMedia = ({
  currentFolderId,
  selectedViewMedia,
  onViewMediaChange,
  selectedFilterType,
  onFilterTypeChange,
  onSearch,
  viewIn,
  onEmptyTrash,
  emptyTrashLoading,
}: ListButtonActionMediaProps): ReactNode => {
  const t = useTranslations();

  const filterTypeOptions: MediaOption[] = [
    { label: t('media.everything'), value: 'everything', icon: Filter },
    { label: t('media.image'), value: 'image', icon: Image },
    { label: t('media.video'), value: 'video', icon: Video },
    { label: t('media.document'), value: 'document', icon: FileText },
    { label: t('media.zip'), value: 'zip', icon: FileArchive },
    { label: t('media.audio'), value: 'audio', icon: Music },
  ];

  const viewMediaOptions: MediaOption[] = [
    { label: t('media.allMedia'), value: 'all_media', icon: Globe },
    { label: t('media.trash'), value: 'trash', icon: Trash2 },
    { label: t('media.recent'), value: 'recent', icon: Clock },
    { label: t('media.favorites'), value: 'favorites', icon: Star },
  ];

  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [emptyTrashConfirmOpen, setEmptyTrashConfirmOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Ref to trigger the file picker from UploadProgressPanel
  const uploadPanelRef = useRef<UploadProgressPanelHandle>(null);
  const queryClient = useQueryClient();
  const isFetchingMedia = useIsFetching({ queryKey: MediaDataKeys.all });

  const handleUploadFromLocal = () => {
    uploadPanelRef.current?.openPicker();
  };

  const handleUploadFromURL = () => {
    setDownloadDialogOpen(true);
  };

  const handleCreateFolder = () => {
    setCreateFolderDialogOpen(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: MediaDataKeys.all });
  };

  const handleFilterTypeChange = (option: MediaOption) => {
    onFilterTypeChange(option);
  };

  const handleViewMediaChange = (option: MediaOption) => {
    onViewMediaChange(option);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Upload Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ButtonField
              className="h-[2.5rem] cursor-pointer gap-1.5 "
              style={{ backgroundColor: 'var(--admin-primary-color)' }}
            >
              <Upload className="size-4" />
              {t('media.upload')}
              <ChevronDown className="size-3.5" />
            </ButtonField>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={handleUploadFromLocal}
              className="gap-2 cursor-pointer"
              style={{ color: 'var(--admin-text-color)' }}
            >
              <Upload className="size-4" style={{ color: 'var(--admin-secondary-color)' }} />
              {t('media.uploadFromLocal')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleUploadFromURL}
              className="gap-2 cursor-pointer"
              style={{ color: 'var(--admin-text-color)' }}
            >
              <Link className="size-4" style={{ color: 'var(--admin-secondary-color)' }} />
              {t('media.uploadFromURL')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Create Folder Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <ButtonField
              size="icon"
              className="h-[2.5rem] w-[2.5rem] cursor-pointer "
              style={{ backgroundColor: 'var(--admin-primary-color)' }}
              onClick={handleCreateFolder}
            >
              <FolderPlus className="size-4" />
            </ButtonField>
          </TooltipTrigger>
          <TooltipContent>{t('media.createFolder')}</TooltipContent>
        </Tooltip>

        {/* Refresh Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <ButtonField
              size="icon"
              className="h-[2.5rem] w-[2.5rem] cursor-pointer "
              style={{ backgroundColor: 'var(--admin-primary-color)' }}
              onClick={handleRefresh}
              disabled={isFetchingMedia > 0}
            >
              <RefreshCw className={`size-4 ${isFetchingMedia > 0 ? 'animate-spin' : ''}`} />
            </ButtonField>
          </TooltipTrigger>
          <TooltipContent>{t('media.refresh')}</TooltipContent>
        </Tooltip>

        {/* Filter Type Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ButtonField
              className="h-[2.5rem] cursor-pointer gap-1.5 "
              style={{ backgroundColor: 'var(--admin-primary-color)' }}
            >
              <Filter className="size-4" />
              ( <selectedFilterType.icon className="size-4" />{' '}
              {filterTypeOptions.find((o) => o.value === selectedFilterType.value)?.label ??
                selectedFilterType.label}{' '}
              )
              <ChevronDown className="size-3.5" />
            </ButtonField>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {filterTypeOptions.map((option) => {
              const isActive = selectedFilterType.value === option.value;
              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleFilterTypeChange(option)}
                  className={`gap-2 cursor-pointer ${isActive ? 'font-medium' : ''}`}
                  style={{
                    color: isActive ? 'var(--admin-primary-color)' : 'var(--admin-text-color)',
                  }}
                >
                  <option.icon
                    className="size-4"
                    style={{
                      color: isActive
                        ? 'var(--admin-primary-color)'
                        : 'var(--admin-secondary-color)',
                    }}
                  />
                  {option.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Media Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ButtonField
              className="h-[2.5rem] cursor-pointer gap-1.5 "
              style={{ backgroundColor: 'var(--admin-primary-color)' }}
            >
              <Eye className="size-4" />
              ( <selectedViewMedia.icon className="size-4" />{' '}
              {viewMediaOptions.find((o) => o.value === selectedViewMedia.value)?.label ??
                selectedViewMedia.label}{' '}
              )
              <ChevronDown className="size-3.5" />
            </ButtonField>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {viewMediaOptions.map((option) => {
              const isActive = selectedViewMedia.value === option.value;
              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleViewMediaChange(option)}
                  className={`gap-2 cursor-pointer ${isActive ? 'font-medium' : ''}`}
                  style={{
                    color: isActive ? 'var(--admin-primary-color)' : 'var(--admin-text-color)',
                  }}
                >
                  <option.icon
                    className="size-4"
                    style={{
                      color: isActive
                        ? 'var(--admin-primary-color)'
                        : 'var(--admin-secondary-color)',
                    }}
                  />
                  {option.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Empty Trash Button — only visible in trash view */}
        {viewIn === 'trash' ? (
          <ButtonField
            className="h-[2.5rem] bg-red-600 hover:bg-red-700 text-white cursor-pointer gap-1.5"
            onClick={() => setEmptyTrashConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
            {t('media.emptyTrash')}
          </ButtonField>
        ) : null}
      </div>

      {/* Search input */}
      <div className="mt-2 w-full md:w-[18.75rem]">
        <InputField
          placeholder={t('media.searchPlaceholder')}
          className="h-[2.5rem]"
          value={searchValue}
          onValueChange={setSearchValue}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter') onSearch(searchValue);
          }}
          actions={[
            {
              key: 'search-btn',
              position: 'end' as const,
              render: () => (
                <ButtonField
                  variant="ghost"
                  size="icon"
                  className="size-7 cursor-pointer"
                  onClick={() => onSearch(searchValue)}
                >
                  <Search className="size-4" style={{ color: 'var(--admin-text-color)' }} />
                </ButtonField>
              ),
            },
          ]}
        />
      </div>

      {/* Upload progress panel (floating bottom-right) */}
      <UploadProgressPanel ref={uploadPanelRef} />

      {/* Download from URL dialog */}
      <DownloadUrlDialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen} />

      {/* Create folder dialog */}
      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
        parentId={currentFolderId}
      />

      {/* Empty trash confirm modal */}
      <ConfirmDeleteModal
        open={emptyTrashConfirmOpen}
        onOpenChange={setEmptyTrashConfirmOpen}
        onConfirm={() => {
          onEmptyTrash?.();
          setEmptyTrashConfirmOpen(false);
        }}
        title={t('media.emptyTrash')}
        description={t('media.emptyTrashDesc')}
        confirmLabel={t('media.confirm')}
        cancelLabel={t('common.close')}
        loading={emptyTrashLoading}
      />
    </TooltipProvider>
  );
};

export default ListButtonActionMedia;
