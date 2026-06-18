"use client";

import { Button } from "@ecom/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ecom/ui/components/dialog";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { Area, Point } from "react-easy-crop";
import Cropper from "react-easy-crop";

interface AvatarCropDialogProps {
  src: string;
  onSave: (blob: Blob) => Promise<void>;
  onClose: () => void;
}

/** Extract the cropped canvas from the source image + pixel crop coordinates */
async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const size = 256; // Always output 256×256
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      "image/jpeg",
      0.9,
    );
  });
}

export function AvatarCropDialog({ src, onSave, onClose }: AvatarCropDialogProps) {
  const t = useTranslations("users.profile");
  const tc = useTranslations("common");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixelCrop: Area) => {
    setCroppedAreaPixels(pixelCrop);
  }, []);

  // Generate preview when crop changes
  const updatePreview = useCallback(async () => {
    if (!croppedAreaPixels) return;
    try {
      const blob = await getCroppedBlob(src, croppedAreaPixels);
      setPreview(URL.createObjectURL(blob));
    } catch {
      // Ignore preview errors
    }
  }, [src, croppedAreaPixels]);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(src, croppedAreaPixels);
      await onSave(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" aria-describedby="avatar-crop-description">
        <DialogHeader>
          <DialogTitle>{t("cropTitle")}</DialogTitle>
          <DialogDescription id="avatar-crop-description" className="sr-only">
            Crop and resize your avatar image
          </DialogDescription>
        </DialogHeader>

        {/* Cropper area */}
        <div className="relative h-[300px] overflow-hidden rounded-md bg-neutral-900">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-1">
          <p className="mb-1 text-xs text-muted-foreground">{t("cropZoom")}</p>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.05}
            onChange={(e) => setZoom(Number(e.target.value))}
            onMouseUp={updatePreview}
            onTouchEnd={updatePreview}
            className="w-full accent-primary"
            aria-label="Zoom"
          />
        </div>

        {/* Size previews */}
        <div className="flex items-center gap-3">
          <p className="min-w-[56px] text-xs text-muted-foreground">{t("cropPreview")}</p>
          {[128, 64, 32].map((size) => (
            // biome-ignore lint/performance/noImgElement: avatar crop preview uses blob URLs — next/image incompatible
            <img
              key={size}
              src={preview ?? src}
              alt="Preview"
              className="rounded-full bg-primary/20 object-cover"
              style={{ width: size, height: size }}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving} id="avatar-crop-cancel">
            {tc("close")}
          </Button>
          <Button onClick={handleSave} disabled={saving} id="avatar-crop-save">
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("cropSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
