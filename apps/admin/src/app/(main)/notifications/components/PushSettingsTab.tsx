"use client";

import { showToast, ToastType } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
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
import { Sheet, SheetContent } from "@ecom/ui/components/sheet";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { Switch } from "@ecom/ui/components/switch";
import { Tabs, TabsList, TabsTrigger } from "@ecom/ui/components/tabs";
import { Textarea } from "@ecom/ui/components/textarea";
import {
  Bell,
  Check,
  ChevronDown,
  Copy,
  Edit2,
  Moon,
  Play,
  RotateCcw,
  Settings2,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

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

interface QuietHoursProps {
  quietHoursEnabled: boolean;
  setQuietHoursEnabled: (v: boolean) => void;
  quietHoursStart: string;
  setQuietHoursStart: (v: string) => void;
  quietHoursEnd: string;
  setQuietHoursEnd: (v: string) => void;
  isSettingsLoading: boolean;
}

function QuietHoursSettingsPanel({
  quietHoursEnabled,
  setQuietHoursEnabled,
  quietHoursStart,
  setQuietHoursStart,
  quietHoursEnd,
  setQuietHoursEnd,
  isSettingsLoading,
}: QuietHoursProps) {
  const t = useTranslations("notifications");
  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Moon className="size-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">{t("dndTitle")}</h2>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center justify-between border border-border p-4 rounded-lg bg-accent/20">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground">{t("dndEnabled")}</span>
              <p className="text-[11px] text-muted-foreground">{t("dndDesc")}</p>
            </div>
            <Switch checked={quietHoursEnabled} onCheckedChange={setQuietHoursEnabled} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="quiet-start"
              className="text-xs font-semibold text-muted-foreground uppercase"
            >
              {t("dndStart")}
            </label>
            <Input
              id="quiet-start"
              type="time"
              value={quietHoursStart}
              onChange={(e) => setQuietHoursStart(e.target.value)}
              disabled={!quietHoursEnabled || isSettingsLoading}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="quiet-end"
              className="text-xs font-semibold text-muted-foreground uppercase"
            >
              {t("dndEnd")}
            </label>
            <Input
              id="quiet-end"
              type="time"
              value={quietHoursEnd}
              onChange={(e) => setQuietHoursEnd(e.target.value)}
              disabled={!quietHoursEnabled || isSettingsLoading}
              className="h-10 text-sm"
            />
          </div>
        </div>

        {quietHoursEnabled && (
          <div className="text-[11px] text-amber-600 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-lg flex items-center gap-2 animate-in fade-in duration-250 shrink-0">
            <span>💡</span>
            <span>{t("dndActiveHelper", { start: quietHoursStart, end: quietHoursEnd })}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

interface PushInAppProps {
  editorLang: "en" | "vi";
  titleVi: string;
  titleEn: string;
  msgVi: string;
  msgEn: string;
  handleTitleChange: (v: string) => void;
  handleMsgChange: (v: string) => void;
}

function PushInAppSection({
  editorLang,
  titleVi,
  titleEn,
  msgVi,
  msgEn,
  handleTitleChange,
  handleMsgChange,
}: PushInAppProps) {
  return (
    <Card className="p-4 space-y-4">
      <span className="text-[10px] font-bold text-primary tracking-wider uppercase block border-b border-border/40 pb-1">
        Thông báo App (InApp) & Đẩy (Push)
      </span>
      <div className="space-y-1.5">
        <label
          htmlFor="drawer-title"
          className="text-[10px] font-bold text-muted-foreground uppercase"
        >
          Tiêu đề thông báo
        </label>
        <Input
          id="drawer-title"
          value={editorLang === "vi" ? titleVi : titleEn}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="h-9 text-xs font-semibold"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="drawer-msg"
          className="text-[10px] font-bold text-muted-foreground uppercase"
        >
          Nội dung tóm tắt
        </label>
        <Textarea
          id="drawer-msg"
          value={editorLang === "vi" ? msgVi : msgEn}
          onChange={(e) => handleMsgChange(e.target.value)}
          rows={3}
          className="text-xs leading-relaxed"
        />
      </div>
    </Card>
  );
}

function getCompiledPushText(
  template: TemplateData,
  editorLang: "en" | "vi",
  titleVi: string,
  titleEn: string,
  msgVi: string,
  msgEn: string,
  mockVars: Record<string, string>,
): { title: string; body: string } {
  const activeTitle = editorLang === "vi" ? titleVi : titleEn;
  const activeMsg = editorLang === "vi" ? msgVi : msgEn;

  const variablesObj = (template.variables as Record<string, string>) || {};
  let compiledTitle = activeTitle;
  let compiledMsg = activeMsg;

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  for (const key of Object.keys(variablesObj)) {
    const escapedKey = escapeRegExp(key);
    const mockVal = mockVars[key] || `[${variablesObj[key]}]`;

    compiledTitle = compiledTitle.replace(
      new RegExp(`\\{\\{\\{\\s*${escapedKey}\\s*\\}\\}\\}`, "g"),
      mockVal,
    );
    compiledTitle = compiledTitle.replace(
      new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, "g"),
      mockVal,
    );

    compiledMsg = compiledMsg.replace(
      new RegExp(`\\{\\{\\{\\s*${escapedKey}\\s*\\}\\}\\}`, "g"),
      mockVal,
    );
    compiledMsg = compiledMsg.replace(
      new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, "g"),
      mockVal,
    );
  }

  return { title: compiledTitle, body: compiledMsg };
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
  titleVi: string;
  titleEn: string;
  msgVi: string;
  msgEn: string;
  channelPush: boolean;
  setChannelPush: (v: boolean) => void;
  mockVars: Record<string, string>;
  setMockVars: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  channelInApp: boolean;
  setChannelInApp: (v: boolean) => void;
}

function PushPreviewTab(props: CombinedDrawerProps) {
  const t = useTranslations("notifications");
  const {
    editingTemplate,
    editorLang,
    titleEn,
    titleVi,
    msgEn,
    msgVi,
    channelPush,
    setChannelPush,
    mockVars,
    setMockVars,
  } = props;

  const { title, body } = getCompiledPushText(
    editingTemplate,
    editorLang,
    titleVi,
    titleEn,
    msgVi,
    msgEn,
    mockVars,
  );

  const formattedDate = new Date().toLocaleDateString(editorLang === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
      <div className="flex-1 p-6 bg-muted/10 overflow-y-auto flex flex-col gap-4 items-center justify-center">
        {!channelPush && (
          <div className="w-full max-w-[300px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs p-3 rounded-lg flex items-center justify-between gap-4 shrink-0">
            <span className="flex items-center gap-1.5 text-[11px]">
              ⚠️ {t("editor.pushChannelDisabledAlert")}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="bg-background text-amber-600 border-amber-500/30 hover:bg-amber-500/10 h-7 text-[10px] font-bold"
              onClick={() => setChannelPush(true)}
            >
              {t("editor.enableChannelBtn")}
            </Button>
          </div>
        )}

        <div className="w-[300px] h-[520px] rounded-[36px] border-[6px] border-slate-800 bg-slate-900 shadow-2xl relative flex flex-col overflow-hidden select-none">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-20 flex items-center justify-center">
            <div className="size-1.5 rounded-full bg-slate-900/60 ml-auto mr-3" />
          </div>

          <div className="pt-7 px-5 flex items-center justify-between text-white/95 text-[9px] font-semibold z-10 shrink-0">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1.5 border border-white/90 rounded-sm" />
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center text-white/90 z-10 shrink-0">
            <span className="text-[10px] uppercase font-medium tracking-widest text-white/60">
              {formattedDate}
            </span>
            <span className="text-4xl font-extralight tracking-tight mt-1">09:41</span>
          </div>

          <div className="flex-1 px-4 pt-8 pb-6 overflow-y-auto flex flex-col justify-start z-10">
            <div className="bg-white/10 dark:bg-black/35 backdrop-blur-xl border border-white/10 dark:border-black/20 p-3 rounded-2xl shadow-lg flex flex-col gap-1 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-4.5 rounded-md bg-primary flex items-center justify-center shadow-inner">
                    <span className="text-[8px] font-bold text-white uppercase">E</span>
                  </div>
                  <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">
                    ECOM APP
                  </span>
                </div>
                <span className="text-[9px] text-white/50">
                  {editorLang === "vi" ? "bây giờ" : "now"}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-white/90 mt-1 break-words">
                {title || (editorLang === "vi" ? "Tiêu đề thông báo..." : "Notification Title...")}
              </span>
              <p className="text-[10px] text-white/70 leading-normal break-words mt-0.5">
                {body ||
                  (editorLang === "vi"
                    ? "Nội dung tóm tắt thông báo đẩy..."
                    : "Push notification body content...")}
              </p>
            </div>
          </div>

          <div className="pb-4 flex flex-col items-center justify-end z-10 shrink-0 gap-3">
            <div className="flex justify-between w-full px-8">
              <div className="size-7 rounded-full bg-white/10 flex items-center justify-center text-white text-[10px]">
                🔦
              </div>
              <div className="size-7 rounded-full bg-white/10 flex items-center justify-center text-white text-[10px]">
                📷
              </div>
            </div>
            <div className="w-20 h-1 bg-white/40 rounded-full" />
          </div>

          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900 via-purple-900 to-pink-850 opacity-90 z-0" />
        </div>
      </div>

      <div className="w-full lg:w-[350px] border-l border-border p-6 overflow-y-auto bg-background flex flex-col gap-6">
        <MockVariablesForm
          variables={(editingTemplate.variables as Record<string, string>) || {}}
          mockVars={mockVars}
          editorLang={editorLang}
          onChange={(key, val) => setMockVars((prev) => ({ ...prev, [key]: val }))}
        />
      </div>
    </div>
  );
}

interface TemplateDrawerEditorProps extends CombinedDrawerProps {
  drawerMode: "edit_push" | "preview_push";
  setDrawerMode: (v: "edit_push" | "preview_push") => void;
  handleTitleChange: (v: string) => void;
  handleMsgChange: (v: string) => void;
}

function TemplateDrawerEditor(props: TemplateDrawerEditorProps) {
  const { drawerMode, setDrawerMode, channelPush, setChannelPush, channelInApp, setChannelInApp } =
    props;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <div className="border-b border-border bg-muted/10 px-6 py-2 flex items-center justify-between gap-4 shrink-0">
        <Tabs
          value={drawerMode}
          onValueChange={(val) => setDrawerMode(val as "edit_push" | "preview_push")}
          className="w-auto"
        >
          <TabsList className="h-8 p-0.5 bg-muted">
            <TabsTrigger value="edit_push" className="h-7 text-[10px] font-bold px-3">
              <Edit2 className="size-3 mr-1" />
              Soạn thảo Push
            </TabsTrigger>
            <TabsTrigger value="preview_push" className="h-7 text-[10px] font-bold px-3">
              <Play className="size-3 mr-1" />
              Xem trước Lockscreen
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        {drawerMode === "edit_push" && (
          <div className="p-6 overflow-y-auto h-full space-y-6 max-w-[650px] mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between bg-muted/40 p-4 rounded-lg border border-border/60">
                <div className="space-y-0.5 pr-2">
                  <span className="text-[10px] font-bold text-foreground block">
                    KÊNH ĐẨY (PUSH)
                  </span>
                  <p className="text-[9px] text-muted-foreground leading-snug">
                    Gửi cảnh báo nổi trên điện thoại.
                  </p>
                </div>
                <Switch checked={channelPush} onCheckedChange={setChannelPush} />
              </div>

              <div className="flex items-center justify-between bg-muted/40 p-4 rounded-lg border border-border/60">
                <div className="space-y-0.5 pr-2">
                  <span className="text-[10px] font-bold text-foreground block">
                    KÊNH TRONG APP (IN-APP)
                  </span>
                  <p className="text-[9px] text-muted-foreground leading-snug">
                    Lưu danh sách thông báo trên App.
                  </p>
                </div>
                <Switch checked={channelInApp} onCheckedChange={setChannelInApp} />
              </div>
            </div>

            <PushInAppSection
              editorLang={props.editorLang}
              titleVi={props.titleVi}
              titleEn={props.titleEn}
              msgVi={props.msgVi}
              msgEn={props.msgEn}
              handleTitleChange={props.handleTitleChange}
              handleMsgChange={props.handleMsgChange}
            />

            <VariablesGuide
              variablesObj={(props.editingTemplate.variables as Record<string, string>) || {}}
              editorLang={props.editorLang}
            />
          </div>
        )}

        {drawerMode === "preview_push" && <PushPreviewTab {...props} />}
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
};

function getTemplateGroup(type: string): keyof typeof groupConfig {
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
  onToggleChannel: (id: number, channel: "push" | "inApp", checked: boolean) => void;
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

  if (!templates || templates.length === 0) {
    return <Card className="p-8 text-center text-muted-foreground/60">{t("noTemplates")}</Card>;
  }

  // Filter templates: push channel hides layouts completely
  const filtered = templates.filter((tpl) => !tpl.type.startsWith("layout."));

  const groupedTemplates = filtered.reduce(
    (acc, tpl) => {
      const groupKey = getTemplateGroup(tpl.type);
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(tpl);
      return acc;
    },
    {} as Record<keyof typeof groupConfig, TemplateData[]>,
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupConfig).map(([key, config]) => {
        const items = groupedTemplates[key as keyof typeof groupConfig] || [];
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
                    {tpl.type === "customer.verification_code" ||
                    tpl.type === "auth.password_reset" ? (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/20 px-2 py-0.5 rounded-md select-none">
                        Bắt buộc
                      </span>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium uppercase">
                            Push
                          </span>
                          <Switch
                            checked={tpl.channelPush}
                            onCheckedChange={(c) => onToggleChannel(tpl.id, "push", c)}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium uppercase">
                            InApp
                          </span>
                          <Switch
                            checked={tpl.channelInApp}
                            onCheckedChange={(c) => onToggleChannel(tpl.id, "inApp", c)}
                          />
                        </div>
                      </div>
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

export function PushSettingsTab() {
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();

  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const initialTab = (
    ["templates_push", "settings_push"].includes(rawTab || "") ? rawTab : "templates_push"
  ) as "templates_push" | "settings_push";

  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (val: string) => {
    setActiveTab(val as "templates_push" | "settings_push");
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

  const handleToggleChannel = (id: number, channel: "push" | "inApp", checked: boolean) => {
    updateTemplate.mutate({
      id,
      ...(channel === "push" && { channelPush: checked }),
      ...(channel === "inApp" && { channelInApp: checked }),
    });
  };

  const resetTemplateMutation = trpc.viewer.notifications.resetTemplate.useMutation({
    onError: (err) => {
      showToast(ToastType.ERROR, `Khôi phục thất bại: ${err.message}`);
    },
  });

  const { data: settingsData, isLoading: isSettingsLoading } =
    trpc.viewer.settings.getMany.useQuery({
      keys: [
        "notification.quiet_hours.enabled",
        "notification.quiet_hours.start",
        "notification.quiet_hours.end",
      ],
    });

  const saveSettings = trpc.viewer.settings.bulkSet.useMutation({
    onSuccess: () => {
      showToast(ToastType.SUCCESS, t("dndSuccess"));
      utils.viewer.settings.getMany.invalidate();
    },
    onError: (err) => {
      showToast(ToastType.ERROR, `${t("saveError")}: ${err.message}`);
    },
  });

  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState("22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("07:00");

  useEffect(() => {
    if (settingsData) {
      setQuietHoursEnabled(settingsData["notification.quiet_hours.enabled"] === "true");
      setQuietHoursStart(settingsData["notification.quiet_hours.start"] || "22:00");
      setQuietHoursEnd(settingsData["notification.quiet_hours.end"] || "07:00");
    }
  }, [settingsData]);

  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);
  const [editorLang, setEditorLang] = useState<"en" | "vi">("vi");
  const [drawerMode, setDrawerMode] = useState<"edit_push" | "preview_push">("edit_push");
  const [mockVars, setMockVars] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingTemplate) {
      const vars = (editingTemplate.variables as Record<string, string>) || {};
      const initial: Record<string, string> = {};
      for (const k of Object.keys(vars)) {
        initial[k] = "";
      }
      setMockVars(initial);
      setDrawerMode("edit_push");
    } else {
      setMockVars({});
    }
  }, [editingTemplate]);

  const [titleEn, setTitleEn] = useState("");
  const [titleVi, setTitleVi] = useState("");
  const [msgEn, setMsgEn] = useState("");
  const [msgVi, setMsgVi] = useState("");
  const [channelInApp, setChannelInApp] = useState(true);
  const [channelPush, setChannelPush] = useState(true);

  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  useEffect(() => {
    if (editingTemplate) {
      const titleTpl = (editingTemplate.titleTemplate as LocalizedInput) || { en: "", vi: "" };
      const msgTpl = (editingTemplate.messageTemplate as LocalizedInput) || { en: "", vi: "" };

      setTitleEn(titleTpl.en || "");
      setTitleVi(titleTpl.vi || "");
      setMsgEn(msgTpl.en || "");
      setMsgVi(msgTpl.vi || "");
      setChannelInApp(editingTemplate.channelInApp);
      setChannelPush(editingTemplate.channelPush);
    }
  }, [editingTemplate]);

  const handleSaveGlobalSettings = () => {
    saveSettings.mutate({
      items: [
        { key: "notification.quiet_hours.enabled", value: String(quietHoursEnabled) },
        { key: "notification.quiet_hours.start", value: quietHoursStart },
        { key: "notification.quiet_hours.end", value: quietHoursEnd },
      ],
    });
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    updateTemplate.mutate(
      {
        id: editingTemplate.id,
        titleTemplate: { en: titleEn, vi: titleVi },
        messageTemplate: { en: msgEn, vi: msgVi },
        channelInApp,
        channelPush,
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

          const titleTpl = (updatedData.titleTemplate as LocalizedInput) || { en: "", vi: "" };
          const msgTpl = (updatedData.messageTemplate as LocalizedInput) || { en: "", vi: "" };

          setTitleEn(titleTpl.en || "");
          setTitleVi(titleTpl.vi || "");
          setMsgEn(msgTpl.en || "");
          setMsgVi(msgTpl.vi || "");
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

  const handleTitleChange = (val: string) => {
    if (editorLang === "vi") setTitleVi(val);
    else setTitleEn(val);
  };

  const handleMsgChange = (val: string) => {
    if (editorLang === "vi") setMsgVi(val);
    else setMsgEn(val);
  };

  return (
    <div className="space-y-6 pb-10">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 max-w-[400px]">
          <TabsTrigger value="templates_push" className="text-xs">
            <Bell className="size-3.5 mr-1.5" />
            Mẫu thông báo Push/InApp
          </TabsTrigger>
          <TabsTrigger value="settings_push" className="text-xs">
            <Moon className="size-3.5 mr-1.5" />
            Giờ yên lặng (DND)
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "settings_push" && (
        <div className="space-y-6">
          <QuietHoursSettingsPanel
            quietHoursEnabled={quietHoursEnabled}
            setQuietHoursEnabled={setQuietHoursEnabled}
            quietHoursStart={quietHoursStart}
            setQuietHoursStart={setQuietHoursStart}
            quietHoursEnd={quietHoursEnd}
            setQuietHoursEnd={setQuietHoursEnd}
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

      {activeTab === "templates_push" && (
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
          className="w-full overflow-y-auto p-0 flex flex-col h-full bg-card transition-all duration-300 sm:max-w-[850px]"
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
                titleVi={titleVi}
                titleEn={titleEn}
                msgVi={msgVi}
                msgEn={msgEn}
                channelPush={channelPush}
                setChannelPush={setChannelPush}
                mockVars={mockVars}
                setMockVars={setMockVars}
                channelInApp={channelInApp}
                setChannelInApp={setChannelInApp}
                drawerMode={drawerMode}
                setDrawerMode={setDrawerMode}
                handleTitleChange={handleTitleChange}
                handleMsgChange={handleMsgChange}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
