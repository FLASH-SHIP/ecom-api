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
import { AlertCircle, Camera, CheckCircle2, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
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

  // Auto-hide success alert
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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
      {/* Modern Profile Avatar Layout */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 max-w-2xl">
        {/* Left Side: Main Avatar with Hover Camera Overlay */}
        <div className="relative group shrink-0">
          <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-background shadow-md bg-muted flex items-center justify-center relative">
            {displayAvatarUrl ? (
              // biome-ignore lint/performance/noImgElement: avatar uses dynamic upload URLs
              <img
                src={displayAvatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl font-semibold text-muted-foreground uppercase">
                {displayName.slice(0, 2)}
              </span>
            )}
            {/* Hover overlay to change avatar */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer text-white text-[11px] font-medium"
            >
              <Camera size={20} />
              <span>{t("changePhoto")}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Description and Actions */}
        <div className="flex-1 flex flex-col gap-4 text-center sm:text-left pt-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t("avatarTitle")}</h4>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t("avatarDesc")}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
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
              className="h-9 text-xs"
            >
              <Camera className="mr-1.5 size-3.5" />
              {t("choosePhoto")}
            </Button>

            {hasAvatar && (
              <Button
                variant="outline"
                className="h-9 text-xs border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={updateProfile.isPending}
                id="avatar-delete-btn"
              >
                <Trash2 className="mr-1.5 size-3.5" />
                {t("deletePhoto")}
              </Button>
            )}
          </div>
        </div>
      </div>

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
