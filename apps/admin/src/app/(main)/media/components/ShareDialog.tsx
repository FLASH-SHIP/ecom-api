'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@ecom/ui/components/dialog';
import { Separator } from '@ecom/ui/components/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ecom/ui/components/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ecom/ui/components/select';
import { ButtonField, InputField } from './Compat';
import { Copy, X } from 'lucide-react';
import { showToast, ToastType } from '@admin/components/toast-provider';
import { MediaItemType, ShareType } from '../model/media.model';
import type { ShareDialogProps, MediaItem } from '../model/media.model';
import { useTranslations } from 'next-intl';

// ── Share Type Options ────────────────────────────────────────
const SHARE_TYPE_OPTIONS = [
  { label: 'URL', value: ShareType.URL },
  { label: 'Indirect URL', value: ShareType.INDIRECT_URL },
  { label: 'HTML', value: ShareType.HTML },
  { label: 'Markdown', value: ShareType.MARKDOWN },
];

// ── Conversion helpers ────────────────────────────────────────

const isImageType = (item: MediaItem): boolean => item.type === MediaItemType.IMAGE;

const convertItem = (item: MediaItem, shareType: ShareType): string => {
  const url = item.full_url || '';
  const indirectUrl = item.indirect_url || '';
  const alt = item.alt || item.name || '';
  const name = item.name || '';

  switch (shareType) {
    case ShareType.URL:
      return url;
    case ShareType.INDIRECT_URL:
      return indirectUrl;
    case ShareType.HTML:
      return isImageType(item)
        ? `<img src="${url}" alt="${alt}" />`
        : `<a href="${url}" target="_blank">${name}</a>`;
    case ShareType.MARKDOWN:
      return isImageType(item) ? `![${alt}](${url})` : `[${name}](${url})`;
    default:
      return url;
  }
};

// ── Component ─────────────────────────────────────────────────

const ShareDialog = ({ open, onOpenChange, items }: ShareDialogProps): ReactNode => {
  const t = useTranslations('media');
  const [shareType, setShareType] = useState<ShareType>(ShareType.URL);

  const shareResult = useMemo(() => {
    if (items.length === 0) return '';
    return items.map((item) => convertItem(item, shareType)).join('\n');
  }, [items, shareType]);

  const handleCopy = useCallback(() => {
    if (!shareResult) return;
    navigator.clipboard.writeText(shareResult);
    showToast(ToastType.SUCCESS, t('copiedToClipboard'));
  }, [shareResult]);

  const handleShareTypeChange = useCallback((value: ShareType) => {
    setShareType(value);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[34.375rem] p-0 overflow-hidden rounded-[0.875rem] border border-[#e5e7eb] [&>button]:hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-3">
          <DialogTitle
            className="text-[1.25rem] font-semibold"
            style={{ color: 'var(--admin-text-color)' }}
          >
            {t('share')}
          </DialogTitle>
          <DialogClose asChild>
            <ButtonField
              variant="ghost"
              size="icon"
              className="absolute right-6 top-4 rounded-md p-1 text-[#9ca3af] hover:bg-muted cursor-pointer h-auto w-auto"
              aria-label="Close"
              style={{ color: 'var(--admin-text-color)' }}
            >
              <X className="size-4" />
            </ButtonField>
          </DialogClose>
        </div>

        <Separator />

        {/* Body */}
        <div className="px-6 pt-4 pb-6 flex flex-col gap-5">
          {/* Share Type Select */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[0.875rem] font-semibold"
              style={{ color: 'var(--admin-text-color)' }}
            >
              {t('shareType')}
            </span>
            <Select
              value={shareType}
              onValueChange={handleShareTypeChange}
            >
              <SelectTrigger className="w-full h-[2.5rem] rounded-[0.625rem] border border-[#e5e7eb] bg-white px-4 text-[0.875rem] outline-none focus:border-[#94a3b8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHARE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Share Results */}
          <InputField
            as="textarea"
            label={t('shareResults')}
            readOnly
            value={shareResult}
            onValueChange={() => {}}
            rows={Math.min(Math.max(items.length * 2, 4), 12)}
            className="w-full rounded-[0.625rem] border border-[#e5e7eb] bg-[#f9fafb] p-4 text-[0.8125rem] font-mono text-[#374151] outline-none resize-y min-h-[7.5rem] max-h-[18.75rem]"
          />

          {/* Copy Button */}
          <div className="flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ButtonField
                    onClick={handleCopy}
                    disabled={!shareResult}
                    variant="outline"
                    size="icon"
                    className="h-[2.25rem] w-[2.25rem] rounded-[0.5rem] cursor-pointer"
                    style={{ backgroundColor: 'var(--admin-primary-color)' }}
                  >
                    <Copy className="size-4 text-[#fff]" />
                  </ButtonField>
                </TooltipTrigger>
                <TooltipContent>{t('copyToClipboard')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
