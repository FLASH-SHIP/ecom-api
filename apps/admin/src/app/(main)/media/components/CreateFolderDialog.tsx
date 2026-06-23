"use client";

import { showToast, ToastType } from "@admin/components/toast-provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ecom/ui/components/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useState } from "react";
import { useMutationCreateMediaFolder } from "../api/hook";
import { MediaDataKeys } from "../api/queries";
import type { CreateFolderDialogProps } from "../model/media.model";
import { ButtonField, InputField } from "./Compat";

const CreateFolderDialog = ({
  open,
  onOpenChange,
  parentId,
}: CreateFolderDialogProps): ReactNode => {
  const t = useTranslations("media");
  const tGlobal = useTranslations();
  const [folderName, setFolderName] = useState("");
  const queryClient = useQueryClient();

  const { mutate: createFolder, isPending } = useMutationCreateMediaFolder({
    onSuccess: () => {
      setFolderName("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: MediaDataKeys.all });
      showToast(ToastType.SUCCESS, t("createFolderSuccess"));
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
      color: "#e74c3c",
    });
  }, [folderName, parentId, createFolder]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isPending) {
        handleSubmit();
      }
    },
    [handleSubmit, isPending],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[28.75rem]">
        <DialogHeader>
          <DialogTitle style={{ color: "var(--admin-text-color)" }}>
            {t("createFolder")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 pt-2">
          <InputField
            containerClassName="flex-1"
            placeholder={t("folderName")}
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
                : { backgroundColor: "var(--admin-primary-color)", color: "#fff" }
            }
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : tGlobal("common.create")}
          </ButtonField>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFolderDialog;
