"use client";

import { MediaPickerDialog } from "@admin/components/base/MediaPickerDialog";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Separator } from "@ecom/ui/components/separator";
import { Textarea } from "@ecom/ui/components/textarea";
import { ImageIcon, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

interface SearchEngineOptimizeProps {
  seoTitle: string;
  onChangeSeoTitle: (v: string) => void;
  seoDescription: string;
  onChangeSeoDescription: (v: string) => void;
  seoImage: string;
  onChangeSeoImage: (v: string) => void;
  indexMode: string;
  onChangeIndexMode: (v: string) => void;
  defaultTitle?: string;
  defaultUrl?: string;
  publishDate?: Date | string | null;
}

export function SearchEngineOptimize({
  seoTitle,
  onChangeSeoTitle,
  seoDescription,
  onChangeSeoDescription,
  seoImage,
  onChangeSeoImage,
  indexMode,
  onChangeIndexMode,
  defaultTitle = "",
  defaultUrl = "",
  publishDate,
}: SearchEngineOptimizeProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [origin, setOrigin] = useState("https://dev-api-cms.flashship.net");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host.includes("localhost")) {
        setOrigin(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
      } else {
        setOrigin(window.location.origin);
      }
    }
  }, []);

  const previewTitle = seoTitle.trim() || defaultTitle || "Untitled Tag";

  const formatDate = (dateInput?: Date | string | null) => {
    if (!dateInput) return "";
    try {
      const d = new Date(dateInput);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const formattedDate = formatDate(publishDate);

  const previewUrl = defaultUrl.trim()
    ? `${origin}${defaultUrl.trim().startsWith("/") ? "" : "/"}${defaultUrl.trim()}`
    : `${origin}/tag/...`;

  const previewDescription =
    seoDescription.trim() ||
    "Setup meta title & description to make your site easy to discovered on search engines such as Google";

  const hasInputData = seoTitle.trim() || seoDescription.trim() || seoImage.trim();

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4">
        <CardTitle className="text-sm font-semibold">Search Engine Optimize</CardTitle>
        <Button
          type="button"
          variant="link"
          onClick={() => setShowEdit((prev) => !prev)}
          className="h-auto p-0 text-xs font-semibold text-[#f59f00] hover:text-[#f59f00]/80"
        >
          {showEdit ? "Hide SEO meta" : "Edit SEO meta"}
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-5">
        {/* Google Search Preview */}
        <div className="flex flex-col gap-1 rounded bg-muted/10 p-3 border border-border/40">
          <span className="text-[1.125rem] font-medium text-[#1a0dab] line-clamp-1 hover:underline cursor-pointer">
            {previewTitle}
          </span>
          <span className="text-[0.875rem] text-[#006621] line-clamp-1">{previewUrl}</span>
          <span className="text-[0.875rem] text-[#545454] line-clamp-2">
            {formattedDate ? `${formattedDate} - ` : ""}
            {previewDescription}
          </span>
        </div>

        {showEdit && (
          <div className="flex flex-col gap-5 pt-3 border-t border-dashed border-border/80">
            {/* SEO Title */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-meta-title" className="text-sm font-medium">
                  SEO Title
                </Label>
                <span className="text-xs text-muted-foreground">{seoTitle.length}/60</span>
              </div>
              <Input
                id="seo-meta-title"
                value={seoTitle}
                onChange={(e) => onChangeSeoTitle(e.target.value)}
                placeholder="Enter SEO title"
                maxLength={70}
              />
              <span className="text-xs text-muted-foreground">
                Optimal title length is 50-60 characters. Avoid repeating keywords.
              </span>
            </div>

            {/* SEO Description */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-meta-description" className="text-sm font-medium">
                  SEO Description
                </Label>
                <span className="text-xs text-muted-foreground">{seoDescription.length}/160</span>
              </div>
              <Textarea
                id="seo-meta-description"
                value={seoDescription}
                onChange={(e) => onChangeSeoDescription(e.target.value)}
                placeholder="Enter SEO description"
                rows={4}
                maxLength={200}
              />
              <span className="text-xs text-muted-foreground">
                Optimal description length is 150-160 characters. Provide a summary of the page.
              </span>
            </div>

            {/* SEO Image */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">SEO Image</Label>
              <div className="relative w-36 h-36 rounded-md border border-dashed border-muted-foreground/30 bg-muted/10 flex items-center justify-center overflow-hidden">
                {seoImage ? (
                  <>
                    <Image
                      src={seoImage}
                      alt="SEO image"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onChangeSeoImage("")}
                      className="absolute top-1 right-1 bg-background/80 hover:bg-background rounded-full p-1 shadow-sm h-7 w-7 flex items-center justify-center cursor-pointer z-10"
                    >
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <ImageIcon className="size-8 text-muted-foreground/40 stroke-1" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaPickerOpen(true)}
                >
                  Choose image
                </Button>
                {seoImage && (
                  <span className="text-xs text-muted-foreground truncate max-w-xs">
                    {seoImage.split("/").pop()}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                Recommended size: 1200x630 pixels. Supported formats: JPG, PNG, WEBP.
              </span>
            </div>

            {/* Index Mode */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seo-index-mode" className="text-sm font-medium">
                Index Mode
              </Label>
              <Select value={indexMode} onValueChange={onChangeIndexMode}>
                <SelectTrigger id="seo-index-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="index">Index</SelectItem>
                  <SelectItem value="noindex">No Index</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                Determine if search engines should index this page.
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onInsert={(items) => {
          if (items.length > 0) {
            const url = items[0].full_url || items[0].preview_url || "";
            onChangeSeoImage(url);
          }
        }}
      />
    </Card>
  );
}
