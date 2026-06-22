'use client';

import { ReactNode, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader } from '@ecom/ui/components/card';
import { Separator } from '@ecom/ui/components/separator';
import ListButtonActionMedia from './ListButtonActionMedia';
import MediaContent from './MediaContent';
import type { MediaOption } from '../model/media.model';
import { MediaAction } from '../model/media.model';
import { Globe, Filter } from 'lucide-react';
import { useMutationMediaAction } from '../api/hook';
import { showToast, ToastType } from '@admin/components/toast-provider';
import { useQueryClient } from '@tanstack/react-query';
import { MediaDataKeys } from '../api/queries';
import { useTranslations } from 'next-intl';

const ListMedia = (): ReactNode => {
  const t = useTranslations();
  const cardClass = 'flex flex-col h-full overflow-hidden';

  const DEFAULT_VIEW_MEDIA: MediaOption = {
    label: t('media.allMedia'),
    value: 'all_media',
    icon: Globe,
  };
  const DEFAULT_FILTER: MediaOption = {
    label: t('media.everything'),
    value: 'everything',
    icon: Filter,
  };

  // Lift state lên đây để share giữa ListButtonActionMedia và MediaContent
  const [currentFolderId, setCurrentFolderId] = useState<number | string>(0);
  const [selectedViewMedia, setSelectedViewMedia] = useState<MediaOption>(DEFAULT_VIEW_MEDIA);
  const [selectedFilterType, setSelectedFilterType] = useState<MediaOption>(DEFAULT_FILTER);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { mutate: doEmptyTrash, isPending: emptyTrashLoading } = useMutationMediaAction({
    onSuccess: () => {
      showToast(ToastType.SUCCESS, 'Trash emptied successfully');
      queryClient.invalidateQueries({ queryKey: MediaDataKeys.all });
    },
    onError: (error: any) => {
      showToast(ToastType.ERROR, error?.response?.data?.message);
    },
  });

  const handleEmptyTrash = useCallback(() => {
    doEmptyTrash({
      action: MediaAction.EMPTY_TRASH,
      selected: [],
    });
  }, [doEmptyTrash]);

  const viewIn = selectedViewMedia.value as 'all_media' | 'trash' | 'recent' | 'favorites';

  return (
    <Card className={cardClass}>
      <CardHeader className="p-4">
        <ListButtonActionMedia
          currentFolderId={currentFolderId}
          selectedViewMedia={selectedViewMedia}
          onViewMediaChange={setSelectedViewMedia}
          selectedFilterType={selectedFilterType}
          onFilterTypeChange={setSelectedFilterType}
          onSearch={setSearch}
          viewIn={viewIn}
          onEmptyTrash={handleEmptyTrash}
          emptyTrashLoading={emptyTrashLoading}
        />
      </CardHeader>
      <Separator />
      <CardContent className="p-0 flex-1 min-h-0 overflow-hidden flex flex-col">
        <MediaContent
          currentFolderId={currentFolderId}
          onFolderChange={setCurrentFolderId}
          viewIn={viewIn}
          filter={selectedFilterType.value}
          search={search}
        />
      </CardContent>
    </Card>
  );
};

export default ListMedia;
