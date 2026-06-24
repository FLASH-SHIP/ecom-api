"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { ButtonField, InputField } from "@admin/app/(main)/media/components/Compat";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@ecom/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Separator } from "@ecom/ui/components/separator";
import { Loader2, X } from "lucide-react";

// ── Types (from model) ────────────────────────────────────────

import { ASPECT_PRESETS, type CropData, type CropDialogProps } from "./model/crop.model";

export type { CropData, CropDialogProps } from "./model/crop.model";
export { ASPECT_PRESETS } from "./model/crop.model";

// ── Component ─────────────────────────────────────────────────

export const CropDialog = ({
  open,
  onOpenChange,
  imageUrl,
  imageAlt = "Crop preview",
  onSubmit,
  loading = false,
  title = "Crop",
  submitLabel = "Crop",
}: CropDialogProps): ReactNode => {
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });

  // Actual pixel values (from rendered image)
  const [pixelCrop, setPixelCrop] = useState<CropData>({ x: 0, y: 0, width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [selectedAspect, setSelectedAspect] = useState("free");
  const [imageLoaded, setImageLoaded] = useState(false);

  // Width/Height inputs
  const [inputWidth, setInputWidth] = useState("");
  const [inputHeight, setInputHeight] = useState("");

  // Computed aspect value from selected preset
  const aspectValue = useMemo(() => {
    if (selectedAspect === "free") return undefined;
    if (selectedAspect === "original" && naturalSize.width > 0 && naturalSize.height > 0) {
      return naturalSize.width / naturalSize.height;
    }
    const preset = ASPECT_PRESETS.find((p) => p.label === selectedAspect);
    return preset?.value;
  }, [selectedAspect, naturalSize]);

  // Aspect ratio options (presets + original)
  const aspectOptions = useMemo(() => {
    const opts = ASPECT_PRESETS.map((p) => ({ key: p.label, label: p.label }));
    if (naturalSize.width > 0 && naturalSize.height > 0) {
      // Insert "Original" after "Free"
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const d = gcd(naturalSize.width, naturalSize.height);
      const rw = naturalSize.width / d;
      const rh = naturalSize.height / d;
      opts.splice(1, 0, { key: "original", label: `Original (${rw}:${rh})` });
    }
    return opts;
  }, [naturalSize]);

  // Handler when user picks a new aspect ratio
  const handleAspectChange = useCallback(
    (value: string) => {
      setSelectedAspect(value);
      if (value === "free") return;

      // Compute the ratio
      let ratio: number;
      if (value === "original" && naturalSize.width > 0 && naturalSize.height > 0) {
        ratio = naturalSize.width / naturalSize.height;
      } else {
        const preset = ASPECT_PRESETS.find((p) => p.label === value);
        if (!preset?.value) return;
        ratio = preset.value;
      }

      // Fit the crop box to the image center with the new ratio
      let cropW = naturalSize.width;
      let cropH = Math.round(cropW / ratio);
      if (cropH > naturalSize.height) {
        cropH = naturalSize.height;
        cropW = Math.round(cropH * ratio);
      }
      const cropX = Math.round((naturalSize.width - cropW) / 2);
      const cropY = Math.round((naturalSize.height - cropH) / 2);

      setPixelCrop({ x: cropX, y: cropY, width: cropW, height: cropH });
      setInputWidth(String(cropW));
      setInputHeight(String(cropH));
      setCrop({
        unit: "%",
        x: (cropX / naturalSize.width) * 100,
        y: (cropY / naturalSize.height) * 100,
        width: (cropW / naturalSize.width) * 100,
        height: (cropH / naturalSize.height) * 100,
      });
    },
    [naturalSize],
  );

  // Reset crop when dialog opens with a new image
  useEffect(() => {
    if (open && imageUrl) {
      setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
      setSelectedAspect("free");
      setImageLoaded(false);
      setInputWidth("");
      setInputHeight("");
    }
  }, [open, imageUrl]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imgRef.current = img;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setPixelCrop({ x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight });
    setInputWidth(String(img.naturalWidth));
    setInputHeight(String(img.naturalHeight));
    setImageLoaded(true);
  }, []);

  // Sync pixel values when crop changes
  const handleCropChange = useCallback((c: Crop) => {
    setCrop(c);
  }, []);

  const handleCropComplete = useCallback(
    (_: Crop, percentCrop: Crop) => {
      if (!naturalSize.width || !naturalSize.height) return;
      const px: CropData = {
        x: Math.round((percentCrop.x / 100) * naturalSize.width),
        y: Math.round((percentCrop.y / 100) * naturalSize.height),
        width: Math.round((percentCrop.width / 100) * naturalSize.width),
        height: Math.round((percentCrop.height / 100) * naturalSize.height),
      };
      setPixelCrop(px);
      setInputWidth(String(px.width));
      setInputHeight(String(px.height));
    },
    [naturalSize],
  );

  // Handle manual Width input
  const handleWidthChange = useCallback(
    (val: string) => {
      setInputWidth(val);
      const w = parseInt(val, 10);
      if (!w || w <= 0 || !naturalSize.width) return;
      const clampedW = Math.min(w, naturalSize.width);
      let newH = pixelCrop.height;
      if (aspectValue !== undefined && pixelCrop.width > 0) {
        newH = Math.round(clampedW / aspectValue);
      }
      const clampedH = Math.min(newH, naturalSize.height);
      const newX = Math.min(pixelCrop.x, naturalSize.width - clampedW);
      const newY = Math.min(pixelCrop.y, naturalSize.height - clampedH);
      setPixelCrop({ x: newX, y: newY, width: clampedW, height: clampedH });
      setInputHeight(String(clampedH));
      setCrop({
        unit: "%",
        x: (newX / naturalSize.width) * 100,
        y: (newY / naturalSize.height) * 100,
        width: (clampedW / naturalSize.width) * 100,
        height: (clampedH / naturalSize.height) * 100,
      });
    },
    [naturalSize, pixelCrop, aspectValue],
  );

  // Handle manual Height input
  const handleHeightChange = useCallback(
    (val: string) => {
      setInputHeight(val);
      const h = parseInt(val, 10);
      if (!h || h <= 0 || !naturalSize.height) return;
      const clampedH = Math.min(h, naturalSize.height);
      let newW = pixelCrop.width;
      if (aspectValue !== undefined && pixelCrop.height > 0) {
        newW = Math.round(clampedH * aspectValue);
      }
      const clampedW = Math.min(newW, naturalSize.width);
      const newX = Math.min(pixelCrop.x, naturalSize.width - clampedW);
      const newY = Math.min(pixelCrop.y, naturalSize.height - clampedH);
      setPixelCrop({ x: newX, y: newY, width: clampedW, height: clampedH });
      setInputWidth(String(clampedW));
      setCrop({
        unit: "%",
        x: (newX / naturalSize.width) * 100,
        y: (newY / naturalSize.height) * 100,
        width: (clampedW / naturalSize.width) * 100,
        height: (clampedH / naturalSize.height) * 100,
      });
    },
    [naturalSize, pixelCrop, aspectValue],
  );

  const handleSubmit = useCallback(() => {
    onSubmit(pixelCrop);
  }, [pixelCrop, onSubmit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[51.25rem] p-0 overflow-hidden rounded-[0.875rem] border border-[#e5e7eb] [&>button]:hidden"
        style={{ padding: 0, gap: 0 }}
      >
        {/* Header */}
        <div className="relative flex items-center px-5 py-2">
          <DialogTitle className="text-[1.5rem] font-semibold text-[#1f2a37]">{title}</DialogTitle>
          <DialogClose asChild>
            <ButtonField
              variant="ghost"
              size="icon"
              className="absolute right-5 top-2 rounded-md p-1 text-[#9ca3af] hover:bg-muted cursor-pointer h-auto w-auto"
              aria-label="Close"
            >
              <X className="size-4" />
            </ButtonField>
          </DialogClose>
        </div>

        <Separator />

        {/* Body */}
        <div className="flex gap-6 px-6 pt-4 pb-6">
          {/* Crop area */}
          <div
            className="relative flex-1 min-w-0 flex items-center justify-center bg-[#f0f0f0] rounded-lg overflow-hidden"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='10' height='10' fill='%23ddd'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23ddd'/%3E%3C/svg%3E\")",
            }}
          >
            {imageUrl ? (
              <ReactCrop
                crop={crop}
                onChange={handleCropChange}
                onComplete={handleCropComplete}
                disabled={!imageLoaded}
                aspect={aspectValue}
              >
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  onLoad={onImageLoad}
                  style={{ maxHeight: "31.25rem", width: "auto", height: "auto", display: "block" }}
                />
              </ReactCrop>
            ) : null}
            {!imageLoaded ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#f0f0f0]/80 rounded-lg">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : null}
          </div>

          {/* Controls */}
          <div className="w-[10rem] shrink-0 flex flex-col gap-4 pt-1">
            <InputField
              label="Height"
              type="number"
              value={inputHeight}
              onValueChange={handleHeightChange}
              disabled={!imageLoaded}
            />

            <InputField
              label="Width"
              type="number"
              value={inputWidth}
              onValueChange={handleWidthChange}
              disabled={!imageLoaded}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Aspect ratio</label>
              <Select
                value={selectedAspect}
                onValueChange={handleAspectChange}
                disabled={!imageLoaded}
              >
                <SelectTrigger className="w-full h-[2.25rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aspectOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 flex items-center justify-end gap-3 border-t border-[#e5e7eb]">
          <DialogClose asChild>
            <ButtonField variant="outline" className="h-8 px-4 text-sm rounded-lg cursor-pointer">
              Close
            </ButtonField>
          </DialogClose>
          <ButtonField
            onClick={handleSubmit}
            disabled={loading || !imageLoaded || pixelCrop.width <= 0 || pixelCrop.height <= 0}
            className="h-8 px-4 text-sm rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white cursor-pointer"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : submitLabel}
          </ButtonField>
        </div>
      </DialogContent>
    </Dialog>
  );
};
