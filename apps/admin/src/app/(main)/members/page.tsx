"use client";

import { DataTablePagination } from "@admin/components/DataTablePagination";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDate, formatDateTime } from "@admin/utils/dateFormat";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { Plus, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-100 text-emerald-800",
  INACTIVE: "border-neutral-200 bg-neutral-100 text-neutral-600",
  BANNED: "border-red-200 bg-red-100 text-red-800",
};

const STAT_COLORS: Record<string, string> = {
  total: "text-foreground",
  active: "text-emerald-600",
  inactive: "text-muted-foreground",
  banned: "text-destructive",
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: table with search, filters, create form, and detail panel
export default function MembersPage() {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", name: "", phone: "" });

  const { data, isLoading } = trpc.viewer.members.list.useQuery({
    page,
    perPage: 25,
    search: search || undefined,
    status: (statusFilter as "ACTIVE" | "INACTIVE" | "BANNED") || undefined,
  });
  const { data: stats } = trpc.viewer.members.stats.useQuery();
  const { data: detail } = trpc.viewer.members.get.useQuery(
    { id: selectedId ?? 0 },
    { enabled: !!selectedId },
  );

  const utils = trpc.useUtils();
  const createMut = trpc.viewer.members.create.useMutation({
    onSuccess: () => {
      utils.viewer.members.list.invalidate();
      utils.viewer.members.stats.invalidate();
      setShowCreate(false);
      setCreateForm({ email: "", name: "", phone: "" });
    },
  });
  const updateMut = trpc.viewer.members.update.useMutation({
    onSuccess: () => {
      utils.viewer.members.list.invalidate();
      utils.viewer.members.get.invalidate();
    },
  });
  const deleteMut = trpc.viewer.members.remove.useMutation({
    onSuccess: () => {
      utils.viewer.members.list.invalidate();
      utils.viewer.members.stats.invalidate();
      setSelectedId(null);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <Button
          variant={showCreate ? "outline" : "default"}
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? <X className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
          {showCreate ? tCommon("cancel") : t("addMember")}
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: t("stats.total"), value: stats.total, key: "total" },
            { label: t("stats.active"), value: stats.active, key: "active" },
            { label: t("stats.inactive"), value: stats.inactive, key: "inactive" },
            { label: t("stats.banned"), value: stats.banned, key: "banned" },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("mt-1 text-xl font-bold", STAT_COLORS[s.key])}>
                {s.value.toLocaleString()}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">{t("newMember")}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate(createForm);
            }}
            className="flex flex-wrap gap-3"
          >
            <Input
              type="email"
              placeholder={t("form.emailLabel")}
              required
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              className="min-w-[200px] flex-1"
            />
            <Input
              placeholder={t("form.nameLabel")}
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              className="min-w-[150px] flex-1"
            />
            <Input
              placeholder={t("form.phoneLabel")}
              value={createForm.phone}
              onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-[160px]"
            />
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? t("form.creating") : t("form.create")}
            </Button>
          </form>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          id="members-search"
          placeholder={tCommon("searchPlaceholder")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-[320px] flex-1"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("fields.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{tCommon("all")}</SelectItem>
            <SelectItem value="ACTIVE">{t("status.ACTIVE")}</SelectItem>
            <SelectItem value="INACTIVE">{t("status.INACTIVE")}</SelectItem>
            <SelectItem value="BANNED">{t("status.BANNED")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className="min-w-0 flex-1">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("fields.name")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("fields.email")}
                    </th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                      {t("fields.phone")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("fields.status")}
                    </th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                      {t("detail.memberSince")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
                      <tr key={i} className="border-b border-border">
                        <td colSpan={5} className="px-4 py-3">
                          <Skeleton className="h-4" />
                        </td>
                      </tr>
                    ))
                  ) : !data?.items.length ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="flex flex-col items-center gap-2 py-8">
                          <Users size={48} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">{t("noMembersTitle")}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.items.map((m) => (
                      <tr
                        key={m.id}
                        className={cn(
                          "cursor-pointer border-b border-border transition-colors hover:bg-muted/30",
                          selectedId === m.id && "bg-primary/5",
                        )}
                        onClick={() => setSelectedId(m.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                              {(m.name ?? m.email).charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm">{m.name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">{m.email}</span>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <span className="text-xs text-muted-foreground">{m.phone ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium",
                              STATUS_BADGE[m.status] ??
                                "border-neutral-200 bg-neutral-100 text-neutral-600",
                            )}
                          >
                            {t(`status.${m.status}`)}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(m.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <DataTablePagination
              page={page}
              totalPages={data?.totalPages ?? 1}
              onChange={setPage}
              total={data?.total}
            />
          </Card>
        </div>

        {/* Detail panel */}
        {selectedId && detail && (
          <Card className="w-[300px] shrink-0 self-start p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">{t("detail.title")}</p>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  askConfirm({
                    message: t("detail.deleteConfirm"),
                    onConfirm: () => deleteMut.mutate({ id: detail.id }),
                  });
                }}
              >
                {tCommon("delete")}
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { label: t("fields.email"), value: detail.email },
                { label: t("fields.name"), value: detail.name ?? "—" },
                { label: t("fields.phone"), value: detail.phone ?? "—" },
                {
                  label: t("fields.verified"),
                  value: detail.emailVerified ? formatDate(detail.emailVerified) : tCommon("no"),
                },
                {
                  label: t("fields.lastLogin"),
                  value: detail.lastLoginAt
                    ? formatDateTime(detail.lastLoginAt)
                    : t("detail.never"),
                },
                { label: t("detail.memberSince"), value: formatDate(detail.createdAt) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm">{value}</p>
                </div>
              ))}

              <div>
                <p className="mb-1 text-xs text-muted-foreground">Status</p>
                <div className="flex gap-1">
                  {(["ACTIVE", "INACTIVE", "BANNED"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                        detail.status === s
                          ? STATUS_BADGE[s]
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                      )}
                      onClick={() => updateMut.mutate({ id: detail.id, status: s })}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {detail.socialAccounts.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Social Accounts</p>
                  <div className="flex flex-col gap-1">
                    {detail.socialAccounts.map((sa) => (
                      <div key={sa.id} className="rounded-md bg-muted/50 px-2.5 py-1.5">
                        <span className="text-xs">
                          <strong>{sa.provider}</strong> — {sa.email ?? sa.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.activityLogs.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Recent Activity</p>
                  <div className="flex max-h-[160px] flex-col gap-1 overflow-y-auto">
                    {detail.activityLogs.map((al) => (
                      <div
                        key={al.id}
                        className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5"
                      >
                        <span className="text-xs font-medium">{al.action}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(al.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
