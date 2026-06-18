"use client";

import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { Textarea } from "@ecom/ui/components/textarea";
import { cn } from "@ecom/ui/lib/utils";
import { Globe, Loader2, Save } from "lucide-react";
import { useState } from "react";

interface PageTranslationPanelProps {
  pageId: number;
  originalTitle: string;
  originalSlug: string;
  originalContent: string | null;
}

/**
 * Collapsible translation panel for pages inline editor.
 * Shows tabs for each active language and allows editing/saving translations
 * directly from the pages list page.
 */
export function PageTranslationPanel({
  pageId,
  originalTitle,
  originalSlug,
  originalContent,
}: PageTranslationPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  const { data: languages } = trpc.viewer.languages.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  const activeLanguages = languages?.filter((l) => l.isActive && !l.isDefault) ?? [];

  if (activeLanguages.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-border">
      <button
        type="button"
        onClick={() => {
          setExpanded(!expanded);
          if (!expanded && !selectedLang && activeLanguages.length > 0) {
            setSelectedLang(activeLanguages[0].code);
          }
        }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-muted/50"
      >
        <Globe className="size-4 text-muted-foreground" />
        Translations
        <span className="ml-auto text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-border p-4">
          {/* Language tabs */}
          <div className="mb-4 flex gap-1">
            {activeLanguages.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setSelectedLang(lang.code)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  selectedLang === lang.code
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {lang.flag ?? ""} {lang.name}
              </button>
            ))}
          </div>

          {/* Translation editor for selected language */}
          {selectedLang && (
            <TranslationEditor
              key={`${pageId}-${selectedLang}`}
              pageId={pageId}
              langCode={selectedLang}
              originalTitle={originalTitle}
              originalSlug={originalSlug}
              originalContent={originalContent}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TranslationEditor({
  pageId,
  langCode,
  originalTitle,
  originalSlug,
  originalContent,
}: {
  pageId: number;
  langCode: string;
  originalTitle: string;
  originalSlug: string;
  originalContent: string | null;
}) {
  const { data: existing, isLoading } = trpc.viewer.translations.get.useQuery(
    { entityType: "page", entityId: pageId, langCode },
    { staleTime: 10_000 },
  );

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [initialized, setInitialized] = useState(false);

  const utils = trpc.useUtils();

  const saveMutation = trpc.viewer.translations.save.useMutation({
    onSuccess: () => {
      utils.viewer.translations.get.invalidate({ entityType: "page", entityId: pageId, langCode });
      utils.viewer.translations.batchTranslationStatus.invalidate();
    },
  });

  // Initialize from existing translation data once loaded
  if (!initialized && !isLoading && existing !== undefined) {
    const data = existing as Record<string, unknown> | null;
    setTitle(typeof data?.title === "string" ? data.title : "");
    setSlug(typeof data?.slug === "string" ? data.slug : "");
    setContent(typeof data?.content === "string" ? data.content : "");
    setInitialized(true);
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading translation...</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
        🌐 Editing <strong>{langCode.toUpperCase()}</strong> translation. Leave blank to use default
        language.
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">
            Title <span className="text-muted-foreground">({originalTitle})</span>
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={originalTitle}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">
            Slug <span className="text-muted-foreground">({originalSlug})</span>
          </Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={originalSlug}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Content</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={originalContent ?? "Page content..."}
          rows={4}
        />
      </div>

      <Button
        type="button"
        size="sm"
        disabled={saveMutation.isPending}
        onClick={() => {
          saveMutation.mutate({
            entityType: "page",
            entityId: pageId,
            langCode,
            data: { title, slug, content },
          });
        }}
      >
        {saveMutation.isPending ? (
          <Loader2 className="mr-2 size-3.5 animate-spin" />
        ) : (
          <Save className="mr-2 size-3.5" />
        )}
        Save {langCode.toUpperCase()} Translation
      </Button>

      {saveMutation.isSuccess && <p className="text-xs text-emerald-600">✅ Translation saved!</p>}
      {saveMutation.error && (
        <p className="text-xs text-destructive">❌ {saveMutation.error.message}</p>
      )}
    </div>
  );
}
