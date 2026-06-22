'use client';

import { ReactNode, useState, useCallback } from 'react';
import type { CreateFolderDialogProps } from '../model/media.model';
import { useMutationCreateMediaFolder } from '../api/hook';
import { ButtonField, InputField } from './Compat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ecom/ui/components/dialog';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { MediaDataKeys } from '../api/queries';
import { showToast, ToastType } from '@admin/components/toast-provider';
import { useTranslations } from 'next-intl';

const CreateFolderDialog = ({
  open,
  onOpenChange,
  parentId,
}: CreateFolderDialogProps): ReactNode => {
  const t = useTranslations();
  const [folderName, setFolderName] = useState('');
  const queryClient = useQueryClient();

  const { mutate: createFolder, isPending } = useMutationCreateMediaFolder({
    onSuccess: () => {
      setFolderName('');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: MediaDataKeys.all });
      showToast(ToastType.SUCCESS, t('media.createFolderSuccess'));
    },
    onError: (error: any) => {
      showToast(ToastType.ERROR, error?.response?.data?.message);
    },
  });

  const handleSubmit = useCallback(() => {
    const trimmed = folderName.trim();
    if (!trimmed) return;

    createFolder({
      name: trimmed,
      parent_id: parentId,
      color: '#e74c3c',
    });
  }, [folderName, parentId, createFolder]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isPending) {
        handleSubmit();
      }
    },
    [handleSubmit, isPending],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[28.75rem]">
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--admin-text-color)' }}>
            {t('media.createFolder')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 pt-2">
          <InputField
            containerClassName="flex-1"
            placeholder={t('media.folderName')}
            value={folderName}
            onValueChange={setFolderName}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            autoFocus
          />
          <ButtonField
            onClick={handleSubmit}
            disabled={!folderName.trim() || isPending}
            className="shrink-0"
            style={
              !folderName.trim() || isPending
                ? undefined
                : { backgroundColor: 'var(--admin-primary-color)', color: '#fff' }
            }
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : t('common.create')}
          </ButtonField>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFolderDialog;
