"use client";

import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ecom/ui/components/dialog";
import { AlertCircle, Camera, CheckCircle2, Trash2, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { AvatarCropDialog } from "./AvatarCropDialog";

interface TargetUser {
  id?: number;
  name?: string | null;
  avatarUrl?: string | null;
}

interface AvatarTabProps {
  userId: number;
  targetUser: TargetUser;
}

export function AvatarTab({ userId, targetUser }: AvatarTabProps) {
  const t = useTranslations("users.profile");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Local preview URL — updated instantly after upload to avoid stale cache
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  // null means "deleted" (show initials), undefined means "not set yet — use targetUser"
  const [previewState, setPreviewState] = useState<"default" | "uploaded" | "deleted">("default");

  const displayAvatarUrl =
    previewState === "deleted"
      ? null
      : previewState === "uploaded"
        ? localPreviewUrl
        : targetUser.avatarUrl;

  const updateProfile = trpc.viewer.auth.updateProfile.useMutation({
    onSuccess: () => {
      setError(null);
      void utils.viewer.auth.me.invalidate();
      void utils.viewer.auth.getUserProfile.invalidate({ userId });
    },
    onError: (err) => {
      setError(err.message);
      setSuccess(null);
      // Revert local preview on error
      setPreviewState("default");
      setLocalPreviewUrl(null);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("invalidImageFile"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleCropSave = async (blob: Blob) => {
    setCropSrc(null);
    setSuccess(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(t("uploadFailed"));

      const { url } = (await res.json()) as { url: string };

      // Update preview immediately — don't wait for React Query refetch
      setLocalPreviewUrl(url);
      setPreviewState("uploaded");

      updateProfile.mutate(
        { userId, avatarUrl: url },
        {
          onSuccess: () => setSuccess(t("avatarUpdateSuccess")),
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorOccurred"));
    }
  };

  const handleDeleteAvatar = () => {
    setShowDeleteConfirm(false);
    setSuccess(null);
    setError(null);

    // Instantly show initials (optimistic update)
    setPreviewState("deleted");

    updateProfile.mutate(
      { userId, avatarUrl: null },
      {
        onSuccess: () => setSuccess(t("avatarDeleted")),
      },
    );
  };

  const hasAvatar = Boolean(displayAvatarUrl);
  const displayName = targetUser.name ?? "User";

  return (
    <div>
      <h3 className="mb-6 text-lg font-semibold">{t("avatarTitle")}</h3>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </span>
          <button type="button" onClick={() => setError(null)}>
            <X className="size-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            {success}
          </span>
          <button type="button" onClick={() => setSuccess(null)}>
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Current avatar + size previews */}
      <div className="flex flex-wrap items-start gap-6">
        {/* Main avatar */}
        <div className="text-center">
          {displayAvatarUrl ? (
            // biome-ignore lint/performance/noImgElement: avatar uses dynamic upload URLs — next/image requires whitelisted domains
            <img
              src={displayAvatarUrl}
              alt={displayName}
              className="h-32 w-32 rounded-full border-3 border-border object-cover"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-3 border-border bg-primary text-primary-foreground">
              <User size={64} />
            </div>
          )}
        </div>

        {/* Size previews — only when avatar exists */}
        {displayAvatarUrl && (
          <div className="flex flex-col justify-center gap-3">
            {[64, 40, 24].map((size) => (
              // biome-ignore lint/performance/noImgElement: avatar size previews use dynamic upload URLs
              <img
                key={size}
                src={displayAvatarUrl}
                alt={displayName}
                className="rounded-full bg-primary/20 object-cover"
                style={{ width: size, height: size }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          id="avatar-file-input"
        />

        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={updateProfile.isPending}
          id="avatar-choose-btn"
        >
          <Camera className="mr-2 size-4" />
          {t("choosePhoto")}
        </Button>

        {/* Xóa ảnh — only show when avatar exists */}
        {hasAvatar && (
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={updateProfile.isPending}
            id="avatar-delete-btn"
          >
            <Trash2 className="mr-2 size-4" />
            {t("deletePhoto")}
          </Button>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{t("avatarHint")}</p>

      {/* Crop dialog */}
      {cropSrc && (
        <AvatarCropDialog src={cropSrc} onSave={handleCropSave} onClose={() => setCropSrc(null)} />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("avatarDeleteTitle")}</DialogTitle>
            <DialogDescription>{t("avatarDeleteMsg")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              id="avatar-delete-cancel-btn"
            >
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAvatar}
              id="avatar-delete-confirm-btn"
            >
              {tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
