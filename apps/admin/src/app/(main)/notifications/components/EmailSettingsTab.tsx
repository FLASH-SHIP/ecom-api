"use client";

import { showToast, ToastType } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { RichTextEditor } from "@admin/components/ui/RichTextEditor";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { Input } from "@ecom/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Sheet, SheetContent } from "@ecom/ui/components/sheet";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { Switch } from "@ecom/ui/components/switch";
import { Tabs, TabsList, TabsTrigger } from "@ecom/ui/components/tabs";
import { Textarea } from "@ecom/ui/components/textarea";
import { cn } from "@ecom/ui/lib/utils";
import {
  Check,
  ChevronDown,
  Copy,
  Edit2,
  FileCode,
  Laptop,
  Mail,
  Play,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface LocalizedInput {
  en: string;
  vi: string;
  [key: string]: string;
}

interface TemplateData {
  id: number;
  type: string;
  titleTemplate: unknown;
  messageTemplate: unknown;
  emailSubjectTemplate: unknown;
  emailBodyTemplate: unknown;
  variables: unknown;
  channelInApp: boolean;
  channelPush: boolean;
  channelEmail: boolean;
  layoutType?: string | null;
}

interface VariablesGuideProps {
  variablesObj: Record<string, string>;
  editorLang: "en" | "vi";
}

function VariablesGuide({ variablesObj, editorLang }: VariablesGuideProps) {
  const t = useTranslations("notifications");
  const variablesKeys = Object.keys(variablesObj);

  if (variablesKeys.length === 0) return null;

  const handleCopy = (v: string) => {
    navigator.clipboard.writeText(`{{${v}}}`);
    showToast(ToastType.SUCCESS, `Đã sao chép biến: {{${v}}}`);
  };

  const getVarDescription = (desc: string) => {
    if (!desc) return "";
    const parts = desc.split(" / ");
    if (parts.length >= 2) {
      return editorLang === "vi" ? parts[0].trim() : parts[1].trim();
    }
    return desc;
  };

  return (
    <div className="text-[11px] text-muted-foreground bg-accent/5 p-3 rounded border border-border/60 mt-4">
      <span className="font-semibold block mb-1.5">{t("supportedVariables")}</span>
      <div className="flex gap-2 flex-wrap">
        {variablesKeys.map((v) => (
          <button
            type="button"
            key={v}
            onClick={() => handleCopy(v)}
            className="flex items-center gap-1.5 bg-muted hover:bg-accent/10 active:scale-95 transition-all px-2.5 py-1 rounded-md text-[10px] border border-border/40 cursor-pointer text-left focus:outline-none group shrink-0"
            title="Click để sao chép biến"
          >
            <code className="font-mono text-primary font-bold text-[9px]">
              {"{{"}
              {v}
              {"}}"}
            </code>
            <span className="text-muted-foreground/80 font-sans text-[9px]">
              ({getVarDescription(variablesObj[v])})
            </span>
            <Copy className="size-3 text-muted-foreground/40 group-hover:text-primary transition-colors ml-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

function compileLayoutVariables(
  htmlTpl: string,
  bodyContent: string,
  title: string,
  logoUrl: string,
  copyrightText: string,
  supportEmail: string,
  customCss: string,
): string {
  let html = htmlTpl;
  const currentYear = new Date().getFullYear().toString();
  const resolvedCopyright =
    copyrightText.replace(/%Y/g, currentYear) || `© ${currentYear} Ecom. All rights reserved.`;

  html = html.replace(/\{\{\{\s*body\s*\}\}\}/g, bodyContent);
  html = html.replace(/\{\{\s*title\s*\}\}/g, title);
  html = html.replace(/\{\{\s*logoUrl\s*\}\}/g, logoUrl || "https://placehold.co/150x40?text=LOGO");
  html = html.replace(/\{\{\s*copyrightText\s*\}\}/g, resolvedCopyright);
  html = html.replace(/\{\{\s*supportEmail\s*\}\}/g, supportEmail || "support@example.com");
  html = html.replace(/\{\{\s*unsubscribeUrl\s*\}\}/g, "#");

  if (customCss) {
    html = html.replace(/<\/head>/i, `<style>${customCss}</style></head>`);
  }
  return html;
}

interface PreviewParams {
  editingTemplate: TemplateData | null;
  editorLang: "en" | "vi";
  emailSubjectVi: string;
  emailSubjectEn: string;
  emailBodyVi: string;
  emailBodyEn: string;
  layoutType: string | null;
  templates?: TemplateData[];
  logoUrl: string;
  copyrightText: string;
  customCss: string;
  supportEmail: string;
  mockVars?: Record<string, string>;
}

function getSimulatedPreviewHtml({
  editingTemplate,
  editorLang,
  emailSubjectVi,
  emailSubjectEn,
  emailBodyVi,
  emailBodyEn,
  layoutType,
  templates,
  logoUrl,
  copyrightText,
  customCss,
  supportEmail,
  mockVars,
}: PreviewParams): string {
  if (!editingTemplate) return "";

  const activeSubject = editorLang === "vi" ? emailSubjectVi : emailSubjectEn;
  const activeBody = editorLang === "vi" ? emailBodyVi : emailBodyEn;

  const variablesObj = (editingTemplate.variables as Record<string, string>) || {};
  let compiledBody = activeBody;
  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const key of Object.keys(variablesObj)) {
    const escapedKey = escapeRegExp(key);
    const mockVal = mockVars?.[key] || `[${variablesObj[key]}]`;
    compiledBody = compiledBody.replace(
      new RegExp(`\\{\\{\\{\\s*${escapedKey}\\s*\\}\\}\\}`, "g"),
      mockVal,
    );
    compiledBody = compiledBody.replace(
      new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, "g"),
      mockVal,
    );
  }

  if (editingTemplate.type.startsWith("layout.")) {
    const sampleTitle = "Mẫu Tiêu Đề Thử Nghiệm";
    const sampleBody = `<p>Đây là nội dung thử nghiệm của email con. Nó sẽ được nhúng trực tiếp vào vị trí <code>{{{body}}}</code> của Layout này.</p>
                        <p style="margin-top: 20px;"><a href="#" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Nút hành động thử</a></p>`;
    return compileLayoutVariables(
      compiledBody,
      sampleBody,
      sampleTitle,
      logoUrl,
      copyrightText,
      supportEmail,
      customCss,
    );
  }

  const selectedLayoutType =
    layoutType ||
    (editingTemplate.type.startsWith("marketing.") ? "layout.marketing" : "layout.default");
  const layoutTpl = templates?.find((t) => t.type === selectedLayoutType);

  if (layoutTpl) {
    const emailBodyMap = (layoutTpl.emailBodyTemplate as Record<string, string>) || {};
    const layoutHtml = emailBodyMap[editorLang] || emailBodyMap.en || "";
    return compileLayoutVariables(
      layoutHtml,
      compiledBody,
      activeSubject,
      logoUrl,
      copyrightText,
      supportEmail,
      customCss,
    );
  }

  return `<div style="padding: 20px; font-family: sans-serif;">
    <h2>${activeSubject}</h2>
    <div>${compiledBody}</div>
  </div>`;
}

interface GlobalEmailSettingsProps {
  logoUrl: string;
  setLogoUrl: (v: string) => void;
  supportEmail: string;
  setSupportEmail: (v: string) => void;
  copyrightText: string;
  setCopyrightText: (v: string) => void;
  customCss: string;
  setCustomCss: (v: string) => void;
  isSettingsLoading: boolean;
}

function GlobalEmailSettingsPanel({
  logoUrl,
  setLogoUrl,
  supportEmail,
  setSupportEmail,
  copyrightText,
  setCopyrightText,
  customCss,
  setCustomCss,
  isSettingsLoading,
}: GlobalEmailSettingsProps) {
  const t = useTranslations("notifications");

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Settings2 className="size-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">{t("branding.title")}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label
            htmlFor="logo-url"
            className="text-xs font-semibold text-muted-foreground uppercase"
          >
            {t("branding.logoLabel")}
          </label>
          <Input
            id="logo-url"
            placeholder="https://example.com/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            disabled={isSettingsLoading}
            className="h-10 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">{t("branding.logoDesc")}</p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="support-email"
            className="text-xs font-semibold text-muted-foreground uppercase"
          >
            {t("branding.supportEmailLabel")}
          </label>
          <Input
            id="support-email"
            type="email"
            placeholder="support@ecom.vn"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            disabled={isSettingsLoading}
            className="h-10 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">{t("branding.supportEmailDesc")}</p>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label
            htmlFor="copyright-text"
            className="text-xs font-semibold text-muted-foreground uppercase"
          >
            {t("branding.copyrightLabel")}
          </label>
          <Input
            id="copyright-text"
            placeholder="© %Y Ecom. All rights reserved."
            value={copyrightText}
            onChange={(e) => setCopyrightText(e.target.value)}
            disabled={isSettingsLoading}
            className="h-10 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">{t("branding.copyrightDesc")}</p>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label
            htmlFor="custom-css"
            className="text-xs font-semibold text-muted-foreground uppercase"
          >
            {t("branding.customCssLabel")}
          </label>
          <Textarea
            id="custom-css"
            placeholder=".email-body { font-family: Inter; } .text-primary { color: #10b981; }"
            value={customCss}
            onChange={(e) => setCustomCss(e.target.value)}
            disabled={isSettingsLoading}
            rows={4}
            className="text-xs leading-relaxed font-mono"
          />
          <p className="text-[10px] text-muted-foreground">{t("branding.customCssDesc")}</p>
        </div>
      </div>
    </Card>
  );
}

interface HTMLCodeEditorProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
}

function HTMLCodeEditor({ id, value, onChange }: HTMLCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleScroll = () => {
    if (textareaRef.current) {
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
      if (preRef.current) {
        preRef.current.scrollTop = textareaRef.current.scrollTop;
        preRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const val = e.currentTarget.value;
      const newValue = `${val.substring(0, start)}  ${val.substring(end)}`;
      onChange(newValue);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const lines = value.split("\n");

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: custom HTML tokenizer
  const highlightHTML = (code: string) => {
    if (!code) return "";

    const escapeChar = (char: string) => {
      if (char === "&") return "&amp;";
      if (char === "<") return "&lt;";
      if (char === ">") return "&gt;";
      return char;
    };

    let result = "";
    let i = 0;
    const n = code.length;

    while (i < n) {
      if (code.substring(i, i + 4) === "<!--") {
        const endIdx = code.indexOf("-->", i + 4);
        if (endIdx !== -1) {
          const comment = code.substring(i, endIdx + 3);
          const escapedComment = comment
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          result += `<span class="text-muted-foreground/60 font-normal italic">${escapedComment}</span>`;
          i = endIdx + 3;
          continue;
        }
      }

      if (code.substring(i, i + 3) === "{{{") {
        const endIdx = code.indexOf("}}}", i + 3);
        if (endIdx !== -1) {
          const variable = code.substring(i, endIdx + 3);
          const escapedVar = variable
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          result += `<span class="text-rose-600 dark:text-rose-400 font-bold">${escapedVar}</span>`;
          i = endIdx + 3;
          continue;
        }
      }
      if (code.substring(i, i + 2) === "{{") {
        const endIdx = code.indexOf("}}", i + 2);
        if (endIdx !== -1) {
          const variable = code.substring(i, endIdx + 2);
          const escapedVar = variable
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          result += `<span class="text-rose-600 dark:text-rose-400 font-bold">${escapedVar}</span>`;
          i = endIdx + 2;
          continue;
        }
      }

      if (code[i] === "<") {
        let endIdx = -1;
        let inQuotes = false;
        let quoteChar = "";
        for (let j = i + 1; j < n; j++) {
          const char = code[j];
          if ((char === '"' || char === "'") && code[j - 1] !== "\\") {
            if (!inQuotes) {
              inQuotes = true;
              quoteChar = char;
            } else if (char === quoteChar) {
              inQuotes = false;
            }
          }
          if (char === ">" && !inQuotes) {
            endIdx = j;
            break;
          }
        }

        if (endIdx !== -1) {
          const tagContent = code.substring(i + 1, endIdx);

          // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: custom tag highlighter
          const highlightTag = (content: string) => {
            const nameMatch = content.match(/^\/?[a-zA-Z0-9:-]+/);
            if (!nameMatch) {
              return content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }

            const tagName = nameMatch[0];
            const remaining = content.substring(tagName.length);

            const displayTagName = tagName
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            let tagResult = `<span class="text-blue-600 dark:text-blue-500 font-semibold">&lt;${displayTagName}</span>`;

            let idx = 0;
            const len = remaining.length;

            while (idx < len) {
              if (/\s/.test(remaining[idx])) {
                tagResult += remaining[idx];
                idx++;
                continue;
              }

              const attrMatch = remaining
                .substring(idx)
                .match(/^([a-zA-Z0-9:-]+)\s*=\s*("[^"]*"|'[^']*')/);
              if (attrMatch) {
                const name = attrMatch[1];
                const val = attrMatch[2];
                const escapedName = name
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;");
                const escapedVal = val
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;");

                tagResult += `<span class="text-violet-600 dark:text-violet-400">${escapedName}</span>=<span class="text-emerald-600 dark:text-emerald-500">${escapedVal}</span>`;
                idx += attrMatch[0].length;
                continue;
              }

              const singleMatch = remaining.substring(idx).match(/^([a-zA-Z0-9:-]+)/);
              if (singleMatch) {
                const name = singleMatch[1];
                const escapedName = name
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;");
                tagResult += `<span class="text-violet-600 dark:text-violet-400">${escapedName}</span>`;
                idx += singleMatch[0].length;
                continue;
              }

              tagResult += remaining[idx]
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
              idx++;
            }

            tagResult += `<span class="text-blue-600 dark:text-blue-500 font-semibold">&gt;</span>`;
            return tagResult;
          };

          result += highlightTag(tagContent);
          i = endIdx + 1;
          continue;
        }
      }

      result += escapeChar(code[i]);
      i++;
    }

    return result;
  };

  return (
    <div className="relative border border-input rounded-lg overflow-hidden bg-background font-mono text-xs leading-relaxed h-[450px] flex">
      <div
        ref={lineNumbersRef}
        className="w-10 select-none border-r border-input text-right pr-2.5 py-3 text-muted-foreground/50 bg-muted/20 overflow-hidden"
      >
        {lines.map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: line numbers are stable and stateless
          <div key={i} className="h-[18px]">
            {i + 1}
          </div>
        ))}
      </div>

      <div className="relative flex-1 h-full overflow-hidden">
        <pre
          ref={preRef}
          className="absolute inset-0 pointer-events-none p-3 m-0 overflow-hidden whitespace-pre text-foreground h-full"
          style={{
            lineHeight: "18px",
            fontFamily: "monospace",
          }}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: manually escaped custom HTML highlighter
          dangerouslySetInnerHTML={{ __html: highlightHTML(value) }}
        />

        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="absolute inset-0 w-full h-full p-3 m-0 bg-transparent text-transparent caret-foreground resize-none border-0 outline-none focus:ring-0 font-mono whitespace-pre overflow-auto"
          style={{
            lineHeight: "18px",
            fontFamily: "monospace",
          }}
        />
      </div>
    </div>
  );
}

interface EmailBodyProps {
  isLayout: boolean;
  editorLang: "en" | "vi";
  emailBodyVi: string;
  emailBodyEn: string;
  handleEmailBodyChange: (v: string) => void;
}

function EmailBodyInput({
  isLayout,
  editorLang,
  emailBodyVi,
  emailBodyEn,
  handleEmailBodyChange,
}: EmailBodyProps) {
  const t = useTranslations("notifications");
  const [editorMode, setEditorMode] = useState<"visual" | "code">("visual");

  return (
    <div className="space-y-1.5">
      {!isLayout && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={`emailBody-${editorLang}`}
            className="text-[10px] font-bold text-muted-foreground uppercase block"
          >
            {t("editor.emailBody")}
          </label>
          <div className="flex items-center bg-muted/65 p-0.5 rounded-md border border-border/40 text-[9px] font-bold select-none shrink-0">
            <button
              type="button"
              onClick={() => setEditorMode("visual")}
              className={cn(
                "px-2 py-0.5 rounded transition-all cursor-pointer",
                editorMode === "visual"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("editor.visualMode")}
            </button>
            <button
              type="button"
              onClick={() => setEditorMode("code")}
              className={cn(
                "px-2 py-0.5 rounded transition-all cursor-pointer",
                editorMode === "code"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("editor.codeMode")}
            </button>
          </div>
        </div>
      )}
      {isLayout || editorMode === "code" ? (
        <HTMLCodeEditor
          id={`emailBody-${editorLang}`}
          value={editorLang === "vi" ? emailBodyVi : emailBodyEn}
          onChange={handleEmailBodyChange}
        />
      ) : (
        <div
          id={`emailBody-${editorLang}`}
          className="border border-border rounded bg-background overflow-hidden min-h-[250px]"
        >
          <RichTextEditor
            value={editorLang === "vi" ? emailBodyVi : emailBodyEn}
            onChange={handleEmailBodyChange}
            placeholder={t("editor.emailBodyPlaceholder")}
          />
        </div>
      )}
    </div>
  );
}

interface EmailFormSectionProps {
  isLayout: boolean;
  editorLang: "en" | "vi";
  emailSubjectVi: string;
  emailSubjectEn: string;
  emailBodyVi: string;
  emailBodyEn: string;
  layoutType: string | null;
  setLayoutType: (v: string | null) => void;
  handleEmailSubjectChange: (v: string) => void;
  handleEmailBodyChange: (v: string) => void;
}

function EmailFormSection({
  isLayout,
  editorLang,
  emailSubjectVi,
  emailSubjectEn,
  emailBodyVi,
  emailBodyEn,
  layoutType,
  setLayoutType,
  handleEmailSubjectChange,
  handleEmailBodyChange,
}: EmailFormSectionProps) {
  const t = useTranslations("notifications");

  return (
    <Card className="p-4 space-y-4">
      <span className="text-[10px] font-bold text-primary tracking-wider uppercase block border-b border-border/40 pb-1">
        {isLayout ? t("editor.emailLayoutCodeTitle") : t("editor.emailSectionTitle")}
      </span>
      {!isLayout && (
        <div className="space-y-1.5">
          <label
            htmlFor="drawer-subject"
            className="text-[10px] font-bold text-muted-foreground uppercase"
          >
            {t("editor.emailSubject")}
          </label>
          <Input
            id="drawer-subject"
            value={editorLang === "vi" ? emailSubjectVi : emailSubjectEn}
            onChange={(e) => handleEmailSubjectChange(e.target.value)}
            className="h-9 text-xs font-semibold"
          />
        </div>
      )}
      <EmailBodyInput
        isLayout={isLayout}
        editorLang={editorLang}
        emailBodyVi={emailBodyVi}
        emailBodyEn={emailBodyEn}
        handleEmailBodyChange={handleEmailBodyChange}
      />
      {!isLayout && (
        <div className="space-y-1.5">
          <label
            htmlFor="drawer-layout-type"
            className="text-[10px] font-bold text-muted-foreground uppercase block"
          >
            {t("editor.outerLayoutLabel")}
          </label>
          <Select
            value={layoutType || "auto"}
            onValueChange={(val) => setLayoutType(val === "auto" ? null : val)}
          >
            <SelectTrigger
              id="drawer-layout-type"
              className="h-9 text-xs font-medium bg-background"
            >
              <SelectValue placeholder={t("editor.layoutAuto")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto" className="text-xs">
                {t("editor.layoutAuto")}
              </SelectItem>
              <SelectItem value="layout.default" className="text-xs">
                {t("editor.layoutDefault")}
              </SelectItem>
              <SelectItem value="layout.marketing" className="text-xs">
                {t("editor.layoutMarketing")}
              </SelectItem>
            </SelectContent>
          </Select>
          {layoutType === "layout.marketing" && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded p-3 mt-1.5 animate-in fade-in duration-200">
              <span className="text-[10px] font-bold block mb-1">
                {t("editor.complianceAlertTitle")}
              </span>
              <p className="text-[9px] leading-relaxed">{t("editor.complianceAlertText")}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

interface MockVariablesFormProps {
  variables: Record<string, string>;
  mockVars: Record<string, string>;
  editorLang: "en" | "vi";
  onChange: (key: string, val: string) => void;
}

function MockVariablesForm({ variables, mockVars, editorLang, onChange }: MockVariablesFormProps) {
  const t = useTranslations("notifications");
  const keys = Object.keys(variables);

  const getVarDescription = (desc: string) => {
    if (!desc) return "";
    const parts = desc.split(" / ");
    if (parts.length >= 2) {
      return editorLang === "vi" ? parts[0].trim() : parts[1].trim();
    }
    return desc;
  };

  return (
    <Card className="p-4 space-y-4">
      <span className="text-[10px] font-bold text-primary tracking-wider uppercase block border-b border-border/40 pb-1">
        {t("editor.mockDataTitle")}
      </span>
      {keys.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/60 italic">{t("editor.noVariables")}</p>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k} className="space-y-1">
              <label
                htmlFor={`mock-var-${k}`}
                className="text-[10px] font-bold text-muted-foreground block truncate"
              >
                {k}{" "}
                <span className="font-normal text-[9px] text-muted-foreground/60 font-sans">
                  ({getVarDescription(variables[k])})
                </span>
              </label>
              <Input
                id={`mock-var-${k}`}
                placeholder={`${t("editor.inputPlaceholder")} ${k.toLowerCase()}...`}
                value={mockVars[k] || ""}
                onChange={(e) => onChange(k, e.target.value)}
                className="h-8 text-xs font-semibold"
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

interface CombinedDrawerProps {
  editingTemplate: TemplateData;
  editorLang: "en" | "vi";
  emailSubjectEn: string;
  emailSubjectVi: string;
  emailBodyEn: string;
  emailBodyVi: string;
  layoutType: string | null;
  setLayoutType: (v: string | null) => void;
  testEmailRecipient: string;
  setTestEmailRecipient: (v: string) => void;
  onSendTest: () => void;
  isSendingTest: boolean;
  templates?: TemplateData[];
  logoUrl: string;
  copyrightText: string;
  customCss: string;
  supportEmail: string;
  handleEmailSubjectChange: (v: string) => void;
  handleEmailBodyChange: (v: string) => void;
  drawerMode: string;
  setDrawerMode: (v: "edit_email" | "preview_email") => void;
  mockVars: Record<string, string>;
  setMockVars: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  channelEmail: boolean;
  setChannelEmail: (v: boolean) => void;
}

function EmailPreviewTab(props: CombinedDrawerProps) {
  const t = useTranslations("notifications");
  const {
    editingTemplate,
    editorLang,
    emailSubjectVi,
    emailSubjectEn,
    emailBodyVi,
    emailBodyEn,
    layoutType,
    templates,
    logoUrl,
    copyrightText,
    customCss,
    supportEmail,
    testEmailRecipient,
    setTestEmailRecipient,
    onSendTest,
    isSendingTest,
    channelEmail,
    setChannelEmail,
    mockVars,
    setMockVars,
  } = props;

  const [simulatedHtml, setSimulatedHtml] = useState("");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    const timer = setTimeout(() => {
      const html = getSimulatedPreviewHtml({
        editingTemplate,
        editorLang,
        emailSubjectVi,
        emailSubjectEn,
        emailBodyVi,
        emailBodyEn,
        layoutType,
        templates,
        logoUrl,
        copyrightText,
        customCss,
        supportEmail,
        mockVars,
      });
      setSimulatedHtml(html);
    }, 300);

    return () => clearTimeout(timer);
  }, [
    editingTemplate,
    editorLang,
    emailSubjectVi,
    emailSubjectEn,
    emailBodyVi,
    emailBodyEn,
    layoutType,
    templates,
    logoUrl,
    copyrightText,
    customCss,
    supportEmail,
    mockVars,
  ]);

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[500px]">
      <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
        {!channelEmail && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs p-3 rounded-lg flex items-center justify-between gap-4 shrink-0">
            <span className="flex items-center gap-1.5">
              ⚠️ {t("editor.emailChannelDisabledAlert")}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="bg-background text-amber-600 border-amber-500/30 hover:bg-amber-500/10 h-7 text-[11px] font-bold"
              onClick={() => setChannelEmail(true)}
            >
              {t("editor.enableChannelBtn")}
            </Button>
          </div>
        )}

        <Card className="flex-1 min-h-[400px] p-0 overflow-hidden flex flex-col border shadow-sm bg-background rounded-lg">
          <div className="bg-muted/40 border-b px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Play className="size-3 text-green-500 fill-green-500" />
              {t("editor.emailPreviewTitle")}
            </span>
            <div className="flex items-center bg-muted p-0.5 rounded-md border border-border/40 text-[9px] font-bold select-none shrink-0">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={cn(
                  "px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1",
                  previewDevice === "desktop"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Laptop className="size-3 shrink-0" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={cn(
                  "px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1",
                  previewDevice === "mobile"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Smartphone className="size-3 shrink-0" />
                <span>Mobile</span>
              </button>
            </div>
          </div>
          <div className="flex-1 p-4 bg-muted/20 flex items-center justify-center overflow-auto min-h-[380px]">
            <iframe
              srcDoc={simulatedHtml}
              className={cn(
                "bg-white transition-all duration-300 shadow-sm",
                previewDevice === "mobile"
                  ? "w-[375px] h-[520px] border-x-[8px] border-y-[16px] border-slate-800 rounded-[28px] mx-auto shadow-md"
                  : "w-full h-full min-h-[350px] border border-border/60 rounded",
              )}
              title="Realtime Email Preview"
            />
          </div>
        </Card>
      </div>

      <div className="w-full lg:w-[350px] border-l border-border p-6 overflow-y-auto bg-background flex flex-col gap-6">
        <MockVariablesForm
          variables={(editingTemplate.variables as Record<string, string>) || {}}
          mockVars={mockVars}
          editorLang={editorLang}
          onChange={(key, val) => setMockVars((prev) => ({ ...prev, [key]: val }))}
        />

        <Card className="p-4 space-y-4">
          <span className="text-[10px] font-bold text-primary tracking-wider uppercase block border-b border-border/40 pb-1">
            {t("editor.sendTestTitle")}
          </span>
          <div className="space-y-3">
            <div className="relative">
              <Input
                placeholder={t("editor.testRecipientPlaceholder")}
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                className="h-9 text-xs pl-8"
              />
              <Send className="absolute left-2.5 top-2.5 size-4 text-muted-foreground/60" />
            </div>
            <Button
              onClick={onSendTest}
              disabled={!testEmailRecipient || isSendingTest}
              className="w-full h-9 text-xs font-semibold"
            >
              {isSendingTest ? t("editor.sending") : t("editor.sendTestBtn")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TemplateDrawerEditor(props: CombinedDrawerProps) {
  const { drawerMode, setDrawerMode, channelEmail } = props;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <div className="border-b border-border bg-muted/10 px-6 py-2 flex items-center justify-between gap-4 shrink-0">
        <Tabs
          value={drawerMode}
          onValueChange={(val) => setDrawerMode(val as "edit_email" | "preview_email")}
          className="w-auto"
        >
          <TabsList className="h-8 p-0.5 bg-muted">
            <TabsTrigger value="edit_email" className="h-7 text-[10px] font-bold px-3">
              <Edit2 className="size-3 mr-1" />
              Soạn thảo Email
            </TabsTrigger>
            <TabsTrigger value="preview_email" className="h-7 text-[10px] font-bold px-3">
              <Play className="size-3 mr-1" />
              Xem trước Email
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        {drawerMode === "edit_email" && (
          <div className="p-6 overflow-y-auto h-full space-y-6 max-w-[650px] mx-auto">
            <div className="flex items-center justify-between bg-muted/40 p-4 rounded-lg border border-border/60">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-foreground block">
                  TRẠNG THÁI KÊNH GỬI
                </span>
                <p className="text-[9px] text-muted-foreground">
                  Bật hoặc tắt gửi tin nhắn tự động qua kênh Email của mẫu này.
                </p>
              </div>
              <Switch checked={channelEmail} onCheckedChange={props.setChannelEmail} />
            </div>

            <EmailFormSection
              isLayout={props.editingTemplate.type.startsWith("layout.")}
              editorLang={props.editorLang}
              emailSubjectVi={props.emailSubjectVi}
              emailSubjectEn={props.emailSubjectEn}
              emailBodyVi={props.emailBodyVi}
              emailBodyEn={props.emailBodyEn}
              layoutType={props.layoutType}
              setLayoutType={props.setLayoutType}
              handleEmailSubjectChange={props.handleEmailSubjectChange}
              handleEmailBodyChange={props.handleEmailBodyChange}
            />

            <VariablesGuide
              variablesObj={(props.editingTemplate.variables as Record<string, string>) || {}}
              editorLang={props.editorLang}
            />
          </div>
        )}

        {drawerMode === "preview_email" && <EmailPreviewTab {...props} />}
      </div>
    </div>
  );
}

const groupConfig = {
  auth: {
    name: "Xác thực & Bảo mật",
    desc: "Mã OTP, đặt lại mật khẩu, chào mừng và kích hoạt tài khoản",
    icon: ShieldCheck,
  },
  order: {
    name: "Đơn hàng & Giao dịch",
    desc: "Thông báo tạo đơn, cập nhật trạng thái đơn hàng và hành trình vận chuyển",
    icon: ShoppingBag,
  },
  system: {
    name: "Hệ thống & Khác",
    desc: "Thông báo chung, email quản trị viên và hệ thống",
    icon: Settings2,
  },
  layout: {
    name: "Khung Email",
    desc: "Các khung bao bọc cấu trúc email chung của hệ thống",
    icon: FileCode,
  },
};

function getTemplateGroup(type: string): keyof typeof groupConfig {
  if (type.startsWith("layout.")) return "layout";
  if (type.startsWith("order.")) return "order";
  if (
    type.startsWith("auth.") ||
    type.startsWith("customer.verification_code") ||
    type.startsWith("customer.email_verification") ||
    type.startsWith("customer.password_reset") ||
    type.startsWith("customer.welcome")
  ) {
    return "auth";
  }
  return "system";
}

function getTargetBadge(type: string, t: (key: string) => string) {
  if (type.startsWith("layout.")) return null;

  const isCustomer =
    type.startsWith("customer.") ||
    type.startsWith("order.") ||
    type.startsWith("wallet.") ||
    type.startsWith("promotion.");

  if (isCustomer) {
    return (
      <span className="text-[9px] font-bold text-sky-600 bg-sky-500/10 dark:text-sky-400 dark:bg-sky-500/20 px-1.5 py-0.5 rounded-md select-none shrink-0">
        {t("targetCustomer")}
      </span>
    );
  }

  return (
    <span className="text-[9px] font-bold text-violet-600 bg-violet-500/10 dark:text-violet-400 dark:bg-violet-500/20 px-1.5 py-0.5 rounded-md select-none shrink-0">
      {t("targetAdmin")}
    </span>
  );
}

interface TemplatesListProps {
  templates: TemplateData[] | undefined;
  isLoading: boolean;
  onEdit: (tpl: TemplateData) => void;
  onToggleChannel: (id: number, channel: "email", checked: boolean) => void;
}

function TemplatesListPanel({ templates, isLoading, onEdit, onToggleChannel }: TemplatesListProps) {
  const t = useTranslations("notifications");

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  const grouped = (templates || []).reduce(
    (acc, tpl) => {
      const g = getTemplateGroup(tpl.type);
      if (!acc[g]) acc[g] = [];
      acc[g].push(tpl);
      return acc;
    },
    {} as Record<string, TemplateData[]>,
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupConfig).map(([key, config]) => {
        const items = grouped[key] || [];
        if (items.length === 0) return null;
        const Icon = config.icon;

        return (
          <Card key={key} className="p-6 space-y-4">
            <div className="flex items-start gap-3 border-b border-border pb-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0 flex items-center justify-center size-9">
                <Icon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {t(`groups.${key}.name` as Parameters<typeof t>[0]) || config.name}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {t(`groups.${key}.desc` as Parameters<typeof t>[0]) || config.desc}
                </p>
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {items.map((tpl) => (
                <div
                  key={tpl.id}
                  className="py-3.5 flex items-center justify-between gap-4 first:pt-1 last:pb-1"
                >
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs font-semibold text-foreground block">
                      {t(`templatesList.${tpl.type}` as Parameters<typeof t>[0]) || tpl.type}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-mono text-muted-foreground/80 bg-muted/80 px-2 py-0.5 rounded-md inline-block">
                        {tpl.type}
                      </span>
                      {getTargetBadge(tpl.type, t)}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    {tpl.type.startsWith("layout.") ||
                    tpl.type === "customer.verification_code" ||
                    tpl.type === "auth.password_reset" ? (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/20 px-2 py-0.5 rounded-md select-none">
                        Bắt buộc
                      </span>
                    ) : (
                      <Switch
                        checked={tpl.channelEmail}
                        onCheckedChange={(c) => onToggleChannel(tpl.id, "email", c)}
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(tpl)}
                      className="h-8 text-xs font-semibold"
                    >
                      <Edit2 className="size-3.5 mr-1.5" />
                      Sửa
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function EmailSettingsTab() {
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();

  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const initialTab = (
    ["templates_email", "settings_email"].includes(rawTab || "") ? rawTab : "templates_email"
  ) as "templates_email" | "settings_email";

  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (val: string) => {
    setActiveTab(val as "templates_email" | "settings_email");
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", val);
    router.push(`?${params.toString()}`);
  };

  const { data: templates, isLoading } = trpc.viewer.notifications.listTemplates.useQuery();

  const updateTemplate = trpc.viewer.notifications.updateTemplate.useMutation({
    onSuccess: () => {
      showToast(ToastType.SUCCESS, t("saveSuccess"));
      utils.viewer.notifications.listTemplates.invalidate();
    },
    onError: (err) => {
      showToast(ToastType.ERROR, `${t("saveError")}: ${err.message}`);
    },
  });

  const handleToggleChannel = (id: number, _channel: "email", checked: boolean) => {
    updateTemplate.mutate({
      id,
      channelEmail: checked,
    });
  };

  const sendTest = trpc.viewer.notifications.sendTestTemplate.useMutation({
    onSuccess: () => {
      showToast(ToastType.SUCCESS, "Đã gửi email thử nghiệm thành công!");
    },
    onError: (err) => {
      showToast(ToastType.ERROR, `Gửi thử thất bại: ${err.message}`);
    },
  });

  const resetTemplateMutation = trpc.viewer.notifications.resetTemplate.useMutation({
    onError: (err) => {
      showToast(ToastType.ERROR, `Khôi phục thất bại: ${err.message}`);
    },
  });

  const { data: settingsData, isLoading: isSettingsLoading } =
    trpc.viewer.settings.getMany.useQuery({
      keys: [
        "notification.email.logo_url",
        "notification.email.copyright_text",
        "notification.email.custom_css",
        "notification.email.support_email",
      ],
    });

  const saveSettings = trpc.viewer.settings.bulkSet.useMutation({
    onSuccess: () => {
      showToast(ToastType.SUCCESS, "Lưu cấu hình thương hiệu thành công!");
      utils.viewer.settings.getMany.invalidate();
    },
    onError: (err) => {
      showToast(ToastType.ERROR, `${t("saveError")}: ${err.message}`);
    },
  });

  const [logoUrl, setLogoUrl] = useState("");
  const [copyrightText, setCopyrightText] = useState("");
  const [customCss, setCustomCss] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  useEffect(() => {
    if (settingsData) {
      setLogoUrl(settingsData["notification.email.logo_url"] || "");
      setCopyrightText(settingsData["notification.email.copyright_text"] || "");
      setCustomCss(settingsData["notification.email.custom_css"] || "");
      setSupportEmail(settingsData["notification.email.support_email"] || "");
    }
  }, [settingsData]);

  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);
  const [editorLang, setEditorLang] = useState<"en" | "vi">("vi");
  const [drawerMode, setDrawerMode] = useState<"edit_email" | "preview_email">("edit_email");
  const [mockVars, setMockVars] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingTemplate) {
      const vars = (editingTemplate.variables as Record<string, string>) || {};
      const initial: Record<string, string> = {};
      for (const k of Object.keys(vars)) {
        initial[k] = "";
      }
      setMockVars(initial);
      setDrawerMode("edit_email");
    } else {
      setMockVars({});
    }
  }, [editingTemplate]);

  const [emailSubjectEn, setEmailSubjectEn] = useState("");
  const [emailSubjectVi, setEmailSubjectVi] = useState("");
  const [emailBodyEn, setEmailBodyEn] = useState("");
  const [emailBodyVi, setEmailBodyVi] = useState("");
  const [channelEmail, setChannelEmail] = useState(true);
  const [layoutType, setLayoutType] = useState<string | null>(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState("");

  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  useEffect(() => {
    if (editingTemplate) {
      const emailSubjectTpl = (editingTemplate.emailSubjectTemplate as LocalizedInput) || {
        en: "",
        vi: "",
      };
      const emailBodyTpl = (editingTemplate.emailBodyTemplate as LocalizedInput) || {
        en: "",
        vi: "",
      };

      setEmailSubjectEn(emailSubjectTpl.en || "");
      setEmailSubjectVi(emailSubjectTpl.vi || "");
      setEmailBodyEn(emailBodyTpl.en || "");
      setEmailBodyVi(emailBodyTpl.vi || "");
      setChannelEmail(editingTemplate.channelEmail);
      setLayoutType(editingTemplate.layoutType || null);
    }
  }, [editingTemplate]);

  const handleSaveGlobalSettings = () => {
    saveSettings.mutate({
      items: [
        { key: "notification.email.logo_url", value: logoUrl },
        { key: "notification.email.copyright_text", value: copyrightText },
        { key: "notification.email.custom_css", value: customCss },
        { key: "notification.email.support_email", value: supportEmail },
      ],
    });
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    updateTemplate.mutate(
      {
        id: editingTemplate.id,
        emailSubjectTemplate: { en: emailSubjectEn, vi: emailSubjectVi },
        emailBodyTemplate: { en: emailBodyEn, vi: emailBodyVi },
        channelEmail,
        layoutType: layoutType || null,
      },
      {
        onSuccess: () => {
          setEditingTemplate(null);
        },
      },
    );
  };

  const confirmResetTemplate = () => {
    if (!editingTemplate) return;
    resetTemplateMutation.mutate(
      { id: editingTemplate.id },
      {
        onSuccess: (updatedData) => {
          showToast(ToastType.SUCCESS, "Đã khôi phục về mặc định thành công!");
          utils.viewer.notifications.listTemplates.invalidate();

          const emailSubjectTpl = (updatedData.emailSubjectTemplate as LocalizedInput) || {
            en: "",
            vi: "",
          };
          const emailBodyTpl = (updatedData.emailBodyTemplate as LocalizedInput) || {
            en: "",
            vi: "",
          };

          setEmailSubjectEn(emailSubjectTpl.en || "");
          setEmailSubjectVi(emailSubjectTpl.vi || "");
          setEmailBodyEn(emailBodyTpl.en || "");
          setEmailBodyVi(emailBodyTpl.vi || "");
        },
      },
    );
  };

  const handleResetTemplate = () => {
    if (!editingTemplate) return;
    askConfirm({
      title: "Khôi phục mặc định?",
      message:
        "Bạn có chắc chắn muốn khôi phục mẫu này về nội dung mặc định ban đầu không? Mọi thay đổi hiện tại của bạn sẽ bị ghi đè và không thể hoàn tác.",
      confirmLabel: "Xác nhận đặt lại",
      cancelLabel: "Hủy bỏ",
      confirmColor: "warning",
      onConfirm: confirmResetTemplate,
    });
  };

  const handleSendTestEmail = () => {
    if (!editingTemplate || !testEmailRecipient) return;
    const variablesObj = (editingTemplate.variables as Record<string, string>) || {};
    const sampleVars: Record<string, string> = {};
    for (const key of Object.keys(variablesObj)) {
      sampleVars[key] = `[${variablesObj[key]}]`;
    }

    sendTest.mutate({
      id: editingTemplate.id,
      emailRecipient: testEmailRecipient,
      variables: sampleVars,
    });
  };

  const handleEmailSubjectChange = (val: string) => {
    if (editorLang === "vi") setEmailSubjectVi(val);
    else setEmailSubjectEn(val);
  };

  const handleEmailBodyChange = (val: string) => {
    if (editorLang === "vi") setEmailBodyVi(val);
    else setEmailBodyEn(val);
  };

  return (
    <div className="space-y-6 pb-10">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 max-w-[400px]">
          <TabsTrigger value="templates_email" className="text-xs">
            <Mail className="size-3.5 mr-1.5" />
            Mẫu thư Email
          </TabsTrigger>
          <TabsTrigger value="settings_email" className="text-xs">
            <Settings2 className="size-3.5 mr-1.5" />
            Cấu hình Email chung
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "settings_email" && (
        <div className="space-y-6">
          <GlobalEmailSettingsPanel
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            supportEmail={supportEmail}
            setSupportEmail={setSupportEmail}
            copyrightText={copyrightText}
            setCopyrightText={setCopyrightText}
            customCss={customCss}
            setCustomCss={setCustomCss}
            isSettingsLoading={isSettingsLoading}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSaveGlobalSettings}
              disabled={isSettingsLoading || saveSettings.isPending}
              className="px-6"
            >
              {saveSettings.isPending ? tCommon("saving") : "Lưu cấu hình"}
            </Button>
          </div>
        </div>
      )}

      {activeTab === "templates_email" && (
        <TemplatesListPanel
          templates={templates as unknown as TemplateData[]}
          isLoading={isLoading}
          onEdit={setEditingTemplate}
          onToggleChannel={handleToggleChannel}
        />
      )}

      <Sheet
        open={!!editingTemplate}
        onOpenChange={(open) => {
          if (!open) setEditingTemplate(null);
        }}
      >
        <SheetContent
          className={cn(
            "w-full overflow-y-auto p-0 flex flex-col h-full bg-card transition-all duration-300",
            drawerMode === "edit_email" ? "sm:max-w-[650px]" : "sm:max-w-[85vw]",
          )}
          aria-describedby={undefined}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {editingTemplate && (
            <>
              <div className="flex items-center justify-between border-b border-border pl-6 pr-14 py-4 bg-muted/20">
                <div className="space-y-0.5 min-w-0 pr-4">
                  <h2 className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-[280px]">
                    {t("editor.editPrefix")}
                    {t.has(`templatesList.${editingTemplate.type}` as Parameters<typeof t>[0])
                      ? t(`templatesList.${editingTemplate.type}` as Parameters<typeof t>[0])
                      : editingTemplate.type}
                  </h2>
                  <p className="text-[10px] font-mono text-muted-foreground/80 bg-muted/80 px-2 py-0.5 rounded-md inline-block">
                    {editingTemplate.type}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-[85px] text-xs font-semibold shrink-0 bg-background flex items-center justify-between px-2.5"
                      >
                        <span>{editorLang === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}</span>
                        <ChevronDown className="size-3.5 opacity-50 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[140px]">
                      <DropdownMenuItem
                        onClick={() => setEditorLang("vi")}
                        className="flex items-center justify-between cursor-pointer text-xs"
                      >
                        <span>🇻🇳 Tiếng Việt</span>
                        {editorLang === "vi" && (
                          <Check className="size-3.5 text-primary ml-2 shrink-0" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setEditorLang("en")}
                        className="flex items-center justify-between cursor-pointer text-xs"
                      >
                        <span>🇬🇧 English</span>
                        {editorLang === "en" && (
                          <Check className="size-3.5 text-primary ml-2 shrink-0" />
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResetTemplate}
                    disabled={resetTemplateMutation.isPending || updateTemplate.isPending}
                    className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold shrink-0"
                  >
                    <RotateCcw className="size-3.5 mr-1.5" />
                    <span className="hidden xs:inline">Đặt lại</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleSaveTemplate}
                    disabled={updateTemplate.isPending || resetTemplateMutation.isPending}
                    className="h-8 shrink-0"
                  >
                    <Check className="size-4 mr-1.5" />
                    Lưu
                  </Button>
                </div>
              </div>

              <TemplateDrawerEditor
                editingTemplate={editingTemplate}
                editorLang={editorLang}
                emailSubjectEn={emailSubjectEn}
                emailSubjectVi={emailSubjectVi}
                emailBodyEn={emailBodyEn}
                emailBodyVi={emailBodyVi}
                layoutType={layoutType}
                setLayoutType={setLayoutType}
                testEmailRecipient={testEmailRecipient}
                setTestEmailRecipient={setTestEmailRecipient}
                onSendTest={handleSendTestEmail}
                isSendingTest={sendTest.isPending}
                templates={templates as unknown as TemplateData[]}
                logoUrl={logoUrl}
                copyrightText={copyrightText}
                customCss={customCss}
                supportEmail={supportEmail}
                handleEmailSubjectChange={handleEmailSubjectChange}
                handleEmailBodyChange={handleEmailBodyChange}
                drawerMode={drawerMode}
                setDrawerMode={setDrawerMode}
                mockVars={mockVars}
                setMockVars={setMockVars}
                channelEmail={channelEmail}
                setChannelEmail={setChannelEmail}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
