"use client";

import { DataTablePagination } from "@admin/components/DataTablePagination";
import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { SearchInput } from "@admin/components/ui/SearchInput";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Checkbox } from "@ecom/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ecom/ui/components/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@ecom/ui/components/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ecom/ui/components/table";
import { cn } from "@ecom/ui/lib/utils";
import { ChevronDown, Loader2, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

interface CustomerItem {
  id: string;
  email: string;
  username: string;
  name: string | null;
  phone: string | null;
  groupId: number | null;
  group?: {
    id: number;
    name: string;
    code: string;
  } | null;
}

interface AssignMembersModalProps {
  groupId: number | null;
  groupName?: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: modal component handles searching, popover selection and instant member management
export function AssignMembersModal({
  groupId,
  groupName,
  open,
  onClose,
  onSaved,
}: AssignMembersModalProps) {
  const t = useTranslations("customer-groups");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  const [memberSearch, setMemberSearch] = useState("");
  const [availableSearch, setAvailableSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Selected checkboxes in the table for bulk removal
  const [selectedTableMemberIds, setSelectedTableMemberIds] = useState<string[]>([]);

  // Candidates temporarily checked in the "Add member" dropdown
  const [stagedToAdd, setStagedToAdd] = useState<CustomerItem[]>([]);

  // Popover open state for Add member
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: membersData, isLoading: isMembersLoading } =
    trpc.viewer.customerGroups.getMembers.useQuery(
      {
        groupId: groupId ?? 0,
        search: memberSearch.trim() || undefined,
        page,
        perPage,
      },
      { enabled: open && !!groupId },
    );

  const { data: availableData, isLoading: isAvailableLoading } =
    trpc.viewer.customerGroups.getAvailableCustomers.useQuery(
      {
        groupId: groupId ?? 0,
        search: availableSearch.trim() || undefined,
        limit: 100,
      },
      { enabled: open && !!groupId && addPopoverOpen },
    );

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setMemberSearch("");
      setAvailableSearch("");
      setPage(1);
      setSelectedTableMemberIds([]);
      setStagedToAdd([]);
    }
  }, [open]);

  const assignMut = trpc.viewer.customerGroups.assignMembers.useMutation();
  const removeMut = trpc.viewer.customerGroups.removeMembers.useMutation();

  const membersList = useMemo(() => membersData?.items ?? [], [membersData]);
  const totalCount = membersData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  // Checkbox Select All for current page in Table
  const isAllTableSelected =
    membersList.length > 0 && membersList.every((m) => selectedTableMemberIds.includes(m.id));

  function toggleSelectAllTable() {
    if (isAllTableSelected) {
      setSelectedTableMemberIds([]);
    } else {
      setSelectedTableMemberIds(membersList.map((m) => m.id));
    }
  }

  function toggleTableMember(id: string) {
    setSelectedTableMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  // Toggle selection inside the dropdown
  function handleToggleCandidate(candidate: CustomerItem) {
    setStagedToAdd((prev) =>
      prev.some((c) => c.id === candidate.id)
        ? prev.filter((c) => c.id !== candidate.id)
        : [...prev, candidate],
    );
  }

  // Confirm & Execute adding members from dropdown to current group
  async function executeAssign(customerIds: string[]) {
    if (!groupId || customerIds.length === 0) return;
    try {
      await assignMut.mutateAsync({ groupId, customerIds });
      utils.viewer.customerGroups.list.invalidate();
      utils.viewer.customerGroups.getMembers.invalidate({ groupId });
      utils.viewer.customerGroups.getAvailableCustomers.invalidate({ groupId });
      toast(t("assignModal.assignSuccess"), "success");
      setStagedToAdd([]);
      setAddPopoverOpen(false);
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tCommon("error");
      toast(msg, "error");
    }
  }

  // Click "Thêm" (Add) button in Dropdown Footer
  function handleAddMembersFromDropdown() {
    if (stagedToAdd.length === 0) {
      setAddPopoverOpen(false);
      return;
    }

    const reassignCandidates = stagedToAdd.filter((c) => c.group && c.group.id !== groupId);

    if (reassignCandidates.length > 0) {
      const names = reassignCandidates
        .map((c) => c.name || c.username)
        .slice(0, 3)
        .join(", ");
      const extraCount =
        reassignCandidates.length > 3
          ? t("assignModal.andMore", { count: reassignCandidates.length - 3 })
          : "";

      askConfirm({
        title: t("assignModal.reassignConfirmTitle"),
        message: t("assignModal.reassignConfirmMessage", {
          names: `${names}${extraCount}`,
          groupName: groupName ?? "",
        }),
        confirmLabel: t("assignModal.add"),
        confirmColor: "warning",
        onConfirm: () => {
          executeAssign(stagedToAdd.map((c) => c.id));
        },
      });
    } else {
      executeAssign(stagedToAdd.map((c) => c.id));
    }
  }

  // Remove single member from table
  async function handleRemoveSingle(memberId: string, memberName: string) {
    if (!groupId) return;
    askConfirm({
      title: tCommon("confirm"),
      message: t("assignModal.confirmRemoveSingle", { name: memberName }),
      confirmLabel: tCommon("delete"),
      confirmColor: "error",
      onConfirm: async () => {
        try {
          await removeMut.mutateAsync({ groupId, customerIds: [memberId] });
          utils.viewer.customerGroups.list.invalidate();
          utils.viewer.customerGroups.getMembers.invalidate({ groupId });
          utils.viewer.customerGroups.getAvailableCustomers.invalidate({ groupId });
          toast(t("messages.updateSuccess"), "success");
          setSelectedTableMemberIds((prev) => prev.filter((id) => id !== memberId));
          onSaved();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : tCommon("error");
          toast(msg, "error");
        }
      },
    });
  }

  // Bulk remove checked members from table
  async function handleBulkRemove() {
    if (!groupId || selectedTableMemberIds.length === 0) return;

    askConfirm({
      title: tCommon("confirm"),
      message: t("assignModal.confirmRemoveBulk", { count: selectedTableMemberIds.length }),
      confirmLabel: tCommon("delete"),
      confirmColor: "error",
      onConfirm: async () => {
        try {
          await removeMut.mutateAsync({ groupId, customerIds: selectedTableMemberIds });
          utils.viewer.customerGroups.list.invalidate();
          utils.viewer.customerGroups.getMembers.invalidate({ groupId });
          utils.viewer.customerGroups.getAvailableCustomers.invalidate({ groupId });
          toast(t("messages.updateSuccess"), "success");
          setSelectedTableMemberIds([]);
          onSaved();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : tCommon("error");
          toast(msg, "error");
        }
      },
    });
  }

  // Select all available in dropdown
  const availableList = availableData ?? [];
  const isAllAvailableSelected =
    availableList.length > 0 && availableList.every((c) => stagedToAdd.some((s) => s.id === c.id));

  function toggleSelectAllAvailable() {
    if (isAllAvailableSelected) {
      const idsInAvailable = availableList.map((c) => c.id);
      setStagedToAdd((prev) => prev.filter((c) => !idsInAvailable.includes(c.id)));
    } else {
      const newStaged = [...stagedToAdd];
      for (const candidate of availableList) {
        if (!newStaged.some((s) => s.id === candidate.id)) {
          newStaged.push(candidate);
        }
      }
      setStagedToAdd(newStaged);
    }
  }

  const isMutating = assignMut.isPending || removeMut.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="max-w-3xl p-0 overflow-hidden sm:max-w-4xl"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Header */}
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {t("assignModal.title", { groupName: groupName ?? "" })}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 px-6 py-4">
            {/* Top Toolbar */}
            <div className="flex items-center gap-3">
              {/* 1. Search Table Members */}
              <SearchInput
                value={memberSearch}
                onChange={(val) => {
                  setMemberSearch(val);
                  setPage(1);
                }}
                placeholder={t("assignModal.searchPlaceholder")}
                minChars={2}
                debounceMs={300}
              />

              {/* 2. Add Member Combobox (Shared Popover Pattern) */}
              <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
                <PopoverTrigger asChild>
                  <div
                    className={cn(
                      "flex min-h-10 flex-1 cursor-pointer items-center justify-between gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background hover:bg-accent/50",
                      stagedToAdd.length > 0 ? "py-1" : "",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                      {stagedToAdd.length === 0 ? (
                        <span className="text-muted-foreground">
                          {t("assignModal.addMemberPlaceholder")}
                        </span>
                      ) : (
                        stagedToAdd.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                          >
                            {c.name || c.username}
                            {/* biome-ignore lint/a11y/useSemanticElements: avoid button inside button inside popover trigger */}
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setStagedToAdd((prev) => prev.filter((item) => item.id !== c.id));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  setStagedToAdd((prev) => prev.filter((item) => item.id !== c.id));
                                }
                              }}
                              className="cursor-pointer rounded-full p-0.5 hover:bg-primary/20"
                            >
                              <X className="size-3" />
                            </span>
                          </span>
                        ))
                      )}
                    </div>
                    <ChevronDown className="size-4 shrink-0 opacity-50" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] p-0 shadow-lg" align="start">
                  {/* Search inside Dropdown */}
                  <div className="border-b border-border p-2">
                    <SearchInput
                      value={availableSearch}
                      onChange={(val) => setAvailableSearch(val)}
                      placeholder={t("assignModal.searchCustomers")}
                      minChars={2}
                      debounceMs={300}
                      autoFocus
                      className="w-full"
                      inputClassName="h-9 border-0 shadow-none focus-visible:ring-0"
                    />
                  </div>

                  {/* Dropdown Options List */}
                  <div className="max-h-[260px] overflow-y-auto p-1">
                    {/* Select All */}
                    {/* biome-ignore lint/a11y/useSemanticElements: avoid button inside button with Radix Checkbox */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={toggleSelectAllAvailable}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleSelectAllAvailable();
                        }
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <Checkbox
                        checked={isAllAvailableSelected}
                        tabIndex={-1}
                        className="pointer-events-none"
                      />
                      <span className="font-medium">{t("assignModal.selectAll")}</span>
                    </div>

                    <div className="my-1 h-px bg-border/60" />

                    {isAvailableLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : availableList.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        {tCommon("noResults")}
                      </div>
                    ) : (
                      availableList.map((candidate) => {
                        const isChecked = stagedToAdd.some((c) => c.id === candidate.id);
                        return (
                          /* biome-ignore lint/a11y/useSemanticElements: avoid button inside button with Radix Checkbox */
                          <div
                            role="button"
                            tabIndex={0}
                            key={candidate.id}
                            onClick={() => handleToggleCandidate(candidate)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleToggleCandidate(candidate);
                              }
                            }}
                            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Checkbox
                                checked={isChecked}
                                tabIndex={-1}
                                className="pointer-events-none"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="truncate font-medium text-foreground">
                                  {candidate.name || candidate.username}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                  @{candidate.username} ({candidate.email})
                                </span>
                              </div>
                            </div>
                            {candidate.group && candidate.group.id !== groupId ? (
                              <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                {candidate.group.name}
                              </span>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="grid grid-cols-2 border-t border-border py-1.5 text-center text-sm font-medium">
                    <button
                      type="button"
                      onClick={() => setStagedToAdd([])}
                      className="cursor-pointer border-r border-border py-1.5 text-muted-foreground hover:text-foreground"
                    >
                      {t("assignModal.clear")}
                    </button>
                    <button
                      type="button"
                      disabled={assignMut.isPending}
                      onClick={handleAddMembersFromDropdown}
                      className="cursor-pointer py-1.5 font-semibold text-primary hover:text-primary/80 disabled:opacity-50"
                    >
                      {assignMut.isPending ? (
                        <Loader2 className="mx-auto size-4 animate-spin" />
                      ) : stagedToAdd.length > 0 ? (
                        `${t("assignModal.add")} (${stagedToAdd.length})`
                      ) : (
                        t("assignModal.add")
                      )}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* 3. Prominent Add Action Button on Toolbar when candidates are staged */}
              {stagedToAdd.length > 0 && (
                <Button
                  type="button"
                  onClick={handleAddMembersFromDropdown}
                  disabled={isMutating}
                  className="shrink-0 gap-1.5 font-semibold"
                >
                  {assignMut.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {t("assignModal.add")} ({stagedToAdd.length})
                </Button>
              )}

              {/* 3. Bulk Remove Button (Only shown when items are selected) */}
              {selectedTableMemberIds.length > 0 ? (
                <Button
                  variant="destructive"
                  className="h-10"
                  disabled={isMutating}
                  onClick={handleBulkRemove}
                >
                  {removeMut.isPending ? (
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 size-4" />
                  )}
                  {t("assignModal.removeSelected")}
                </Button>
              ) : null}
            </div>

            {/* Standard Table Component */}
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={isAllTableSelected}
                        onCheckedChange={toggleSelectAllTable}
                      />
                    </TableHead>
                    <TableHead className="w-72">{t("assignModal.colCustomerId")}</TableHead>
                    <TableHead>{t("assignModal.colName")}</TableHead>
                    <TableHead className="w-28 text-center whitespace-nowrap">
                      {t("assignModal.colAction")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isMembersLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center">
                        <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : membersList.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-12 text-center text-sm text-muted-foreground"
                      >
                        {t("assignModal.noMembers")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    membersList.map((member) => {
                      const isChecked = selectedTableMemberIds.includes(member.id);

                      return (
                        <TableRow key={member.id}>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleTableMember(member.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-primary">
                            STD-US-2026 / @{member.username}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {member.name || member.username}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={isMutating}
                              onClick={() =>
                                handleRemoveSingle(member.id, member.name || member.username)
                              }
                              title={tCommon("delete")}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination & Note below */}
            <div className="flex flex-col gap-2">
              <DataTablePagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
                total={totalCount}
              />
              <p className="px-1 text-xs italic text-destructive">{t("assignModal.warningNote")}</p>
            </div>
          </div>

          {/* Standard DialogFooter */}
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isMutating}>
              {tCommon("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
