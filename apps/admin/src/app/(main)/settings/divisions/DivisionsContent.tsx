"use client";

import type { RowAction } from "@admin/components/data-table";
import { DataTable } from "@admin/components/data-table";
import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import { useToast } from "@admin/components/toast-provider";
import { useDebounce } from "@admin/lib/hooks/useDebounce";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { PerfectScroll } from "@ecom/ui/components/perfect-scroll";
import { SearchableSelect } from "@ecom/ui/components/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@ecom/ui/components/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ecom/ui/components/tabs";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

type ProvinceRow = {
  id: number;
  code: number;
  name: string;
  divisionType: string;
  codeName: string;
  phoneCode: number;
};

type WardRow = {
  id: number;
  code: number;
  name: string;
  divisionType: string;
  codeName: string;
  provinceCode: number;
  provinceName: string;
};

export default function DivisionsContent() {
  const t = useTranslations("settings");
  const { toast } = useToast();

  const utils = trpc.useUtils();

  // Tab State
  const [activeTab, setActiveTab] = useState<string>("provinces");

  // Selected Province context for Wards filter
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | undefined>(undefined);
  const [selectedProvinceName, setSelectedProvinceName] = useState<string>("");

  // Province Table State
  const [provSearch, setProvSearch] = useState("");
  const debouncedProvSearch = useDebounce(provSearch, 300);
  const [provPage, setProvPage] = useState(1);
  const [provLimit, setProvLimit] = useState(10);

  // Ward Table State
  const [wardSearch, setWardSearch] = useState("");
  const debouncedWardSearch = useDebounce(wardSearch, 300);
  const [wardPage, setWardPage] = useState(1);
  const [wardLimit, setWardLimit] = useState(10);

  // Drawers State
  const [provDrawerOpen, setProvDrawerOpen] = useState(false);
  const [provEditingId, setProvEditingId] = useState<number | null>(null);

  const [wardDrawerOpen, setWardDrawerOpen] = useState(false);
  const [wardEditingId, setWardEditingId] = useState<number | null>(null);

  // Province Form Fields State
  const [provName, setProvName] = useState("");
  const [provCode, setProvCode] = useState<string>("");
  const [provDivisionType, setProvDivisionType] = useState("tỉnh");
  const [provCodeName, setProvCodeName] = useState("");
  const [provPhoneCode, setProvPhoneCode] = useState<string>("");

  // Ward Form Fields State
  const [wardName, setWardName] = useState("");
  const [wardCode, setWardCode] = useState<string>("");
  const [wardDivisionType, setWardDivisionType] = useState("phường");
  const [wardCodeName, setWardCodeName] = useState("");
  const [wardProvinceCode, setWardProvinceCode] = useState<string>("");

  // Auto-fetch all provinces for dropdown selection in Ward form
  const { data: allProvincesData } = trpc.viewer.divisions.listProvinces.useQuery({
    limit: 100,
  });

  // Queries
  const {
    data: provData,
    isLoading: provLoading,
    isFetching: provFetching,
  } = trpc.viewer.divisions.listProvinces.useQuery({
    search: debouncedProvSearch || undefined,
    page: provPage,
    limit: provLimit,
  });

  const {
    data: wardData,
    isLoading: wardLoading,
    isFetching: wardFetching,
  } = trpc.viewer.divisions.listWards.useQuery({
    provinceCode: selectedProvinceCode,
    search: debouncedWardSearch || undefined,
    page: wardPage,
    limit: wardLimit,
  });

  // Mutations
  const createProvMut = trpc.viewer.divisions.createProvince.useMutation({
    onSuccess: () => {
      toast(t("divisions.toastCreateProvinceSuccess"), "success");
      setProvDrawerOpen(false);
      utils.viewer.divisions.listProvinces.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateProvMut = trpc.viewer.divisions.updateProvince.useMutation({
    onSuccess: () => {
      toast(t("divisions.toastUpdateProvinceSuccess"), "success");
      setProvDrawerOpen(false);
      utils.viewer.divisions.listProvinces.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const createWardMut = trpc.viewer.divisions.createWard.useMutation({
    onSuccess: () => {
      toast(t("divisions.toastCreateWardSuccess"), "success");
      setWardDrawerOpen(false);
      utils.viewer.divisions.listWards.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateWardMut = trpc.viewer.divisions.updateWard.useMutation({
    onSuccess: () => {
      toast(t("divisions.toastUpdateWardSuccess"), "success");
      setWardDrawerOpen(false);
      utils.viewer.divisions.listWards.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  // Data mapping for tables
  const provRows: ProvinceRow[] = useMemo(() => {
    if (!provData?.items) return [];
    return provData.items.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      divisionType: p.divisionType,
      codeName: p.codeName,
      phoneCode: p.phoneCode,
    }));
  }, [provData]);

  const wardRows: WardRow[] = useMemo(() => {
    if (!wardData?.items) return [];
    return wardData.items.map((w) => ({
      id: w.id,
      code: w.code,
      name: w.name,
      divisionType: w.divisionType,
      codeName: w.codeName,
      provinceCode: w.provinceCode,
      provinceName: w.province.name,
    }));
  }, [wardData]);

  const provinceOptions = useMemo(() => {
    return (
      allProvincesData?.items.map((prov) => ({
        value: prov.code.toString(),
        label: prov.name,
      })) ?? []
    );
  }, [allProvincesData?.items]);
  const openCreateProvince = () => {
    setProvEditingId(null);
    setProvName("");
    setProvCode("");
    setProvDivisionType("tỉnh");
    setProvCodeName("");
    setProvPhoneCode("");
    setProvDrawerOpen(true);
  };

  const openEditProvince = useCallback(
    async (id: number) => {
      setProvEditingId(id);
      try {
        const p = await utils.client.viewer.divisions.getProvince.query({ id });
        setProvName(p.name);
        setProvCode(p.code.toString());
        setProvDivisionType(p.divisionType);
        setProvCodeName(p.codeName);
        setProvPhoneCode(p.phoneCode.toString());
        setProvDrawerOpen(true);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        toast(message, "error");
      }
    },
    [utils, toast],
  );

  const handleProvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provName.trim()) return toast(t("divisions.validationRequired"), "error");
    if (!provCode) return toast(t("divisions.validationRequired"), "error");
    if (!provPhoneCode) return toast(t("divisions.validationRequired"), "error");

    const codeInt = parseInt(provCode, 10);
    const phoneInt = parseInt(provPhoneCode, 10);

    if (Number.isNaN(codeInt) || codeInt <= 0)
      return toast(t("divisions.validationPositiveInteger"), "error");
    if (Number.isNaN(phoneInt) || phoneInt <= 0)
      return toast(t("divisions.validationPositiveInteger"), "error");

    const payload = {
      name: provName,
      code: codeInt,
      divisionType: provDivisionType,
      codeName: provCodeName,
      phoneCode: phoneInt,
    };

    if (provEditingId) {
      updateProvMut.mutate({ id: provEditingId, ...payload });
    } else {
      createProvMut.mutate(payload);
    }
  };

  // Ward Form Actions
  const openCreateWard = () => {
    setWardEditingId(null);
    setWardName("");
    setWardCode("");
    setWardDivisionType("phường");
    setWardCodeName("");
    setWardProvinceCode(selectedProvinceCode ? selectedProvinceCode.toString() : "");
    setWardDrawerOpen(true);
  };

  const openEditWard = useCallback(
    async (id: number) => {
      setWardEditingId(id);
      try {
        const w = await utils.client.viewer.divisions.getWard.query({ id });
        setWardName(w.name);
        setWardCode(w.code.toString());
        setWardDivisionType(w.divisionType);
        setWardCodeName(w.codeName);
        setWardProvinceCode(w.provinceCode.toString());
        setWardDrawerOpen(true);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        toast(message, "error");
      }
    },
    [utils, toast],
  );

  const handleWardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardName.trim()) return toast(t("divisions.validationRequired"), "error");
    if (!wardCode) return toast(t("divisions.validationRequired"), "error");
    if (!wardProvinceCode) return toast(t("divisions.validationRequired"), "error");

    const codeInt = parseInt(wardCode, 10);
    const pCodeInt = parseInt(wardProvinceCode, 10);

    if (Number.isNaN(codeInt) || codeInt <= 0)
      return toast(t("divisions.validationPositiveInteger"), "error");
    if (Number.isNaN(pCodeInt) || pCodeInt <= 0)
      return toast(t("divisions.validationPositiveInteger"), "error");

    const payload = {
      name: wardName,
      code: codeInt,
      divisionType: wardDivisionType,
      codeName: wardCodeName,
      provinceCode: pCodeInt,
    };

    if (wardEditingId) {
      updateWardMut.mutate({ id: wardEditingId, ...payload });
    } else {
      createWardMut.mutate(payload);
    }
  };

  // Province Table Columns configuration
  const provColumns: ColumnDef<ProvinceRow>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: t("divisions.colCode"),
        size: 80,
      },
      {
        accessorKey: "name",
        header: t("divisions.colName"),
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer text-sm font-semibold hover:text-primary transition-colors text-left text-foreground"
            onClick={() => {
              setSelectedProvinceCode(row.original.code);
              setSelectedProvinceName(row.original.name);
              // Switch tab to Wards list
              setActiveTab("wards");
            }}
            title="Click to view Wards"
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: "divisionType",
        header: t("divisions.colDivisionType"),
        size: 140,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground capitalize">
            {row.original.divisionType}
          </span>
        ),
      },
      {
        accessorKey: "phoneCode",
        header: t("divisions.colPhoneCode"),
        size: 100,
      },
    ],
    [t],
  );

  // Ward Table Columns configuration
  const wardColumns: ColumnDef<WardRow>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: t("divisions.colCode"),
        size: 80,
      },
      {
        accessorKey: "name",
        header: t("divisions.colName"),
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-foreground">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "divisionType",
        header: t("divisions.colDivisionType"),
        size: 120,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground capitalize">
            {row.original.divisionType}
          </span>
        ),
      },
      {
        accessorKey: "provinceName",
        header: t("divisions.colProvince"),
        size: 140,
      },
    ],
    [t],
  );

  // Row Actions configuration (No Delete action as per specification)
  const provRowActions: RowAction<ProvinceRow>[] = useMemo(
    () => [
      {
        key: "edit",
        tooltip: t("divisions.editProvince"),
        icon: <Pencil size={15} />,
        color: "success",
        onClick: (row) => openEditProvince(row.id),
      },
    ],
    [openEditProvince, t],
  );

  const wardRowActions: RowAction<WardRow>[] = useMemo(
    () => [
      {
        key: "edit",
        tooltip: t("divisions.editWard"),
        icon: <Pencil size={15} />,
        color: "success",
        onClick: (row) => openEditWard(row.id),
      },
    ],
    [openEditWard, t],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Dynamic Header row matching Packing page layout */}
      <div className="flex flex-col">
        <PageBreadcrumb className="mb-2" />
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {activeTab === "provinces" ? t("divisions.provinceList") : t("divisions.wardList")}
          </h1>
          {activeTab === "provinces" ? (
            <Button
              size="sm"
              className="bg-primary hover:opacity-90 transition-opacity self-end sm:self-auto"
              onClick={openCreateProvince}
            >
              <Plus className="mr-1.5 size-4" />
              {t("divisions.addProvince")}
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-primary hover:opacity-90 transition-opacity self-end sm:self-auto"
              onClick={openCreateWard}
            >
              <Plus className="mr-1.5 size-4" />
              {t("divisions.addWard")}
            </Button>
          )}
        </div>
      </div>

      {/* Shadcn Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
          <TabsTrigger value="provinces">{t("divisions.provincesTab")}</TabsTrigger>
          <TabsTrigger value="wards">{t("divisions.wardsTab")}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Provinces */}
        <TabsContent value="provinces">
          <DataTable<ProvinceRow>
            tableKey="admin-provinces"
            defaultPageSize={provLimit}
            defaultPage={provPage}
            data={provRows}
            columns={provColumns}
            rowActions={provRowActions}
            isLoading={provLoading}
            isFetching={provFetching}
            onServerChange={(params) => {
              if (params.page !== undefined) setProvPage(params.page);
              if (params.pageSize !== undefined) setProvLimit(params.pageSize);
              if (params.search !== undefined) setProvSearch(params.search);
            }}
            rowCount={provData?.total ?? 0}
            onRefresh={() => utils.viewer.divisions.listProvinces.invalidate()}
          />
        </TabsContent>

        {/* Tab 2: Wards */}
        <TabsContent value="wards">
          {selectedProvinceCode && (
            <div className="mb-3 p-2 px-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Filtering by province:{" "}
                <strong className="text-primary font-semibold underline">
                  {selectedProvinceName}
                </strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                onClick={() => {
                  setSelectedProvinceCode(undefined);
                  setSelectedProvinceName("");
                }}
              >
                Clear Filter
              </Button>
            </div>
          )}
          <DataTable<WardRow>
            tableKey="admin-wards"
            defaultPageSize={wardLimit}
            defaultPage={wardPage}
            data={wardRows}
            columns={wardColumns}
            rowActions={wardRowActions}
            isLoading={wardLoading}
            isFetching={wardFetching}
            onServerChange={(params) => {
              if (params.page !== undefined) setWardPage(params.page);
              if (params.pageSize !== undefined) setWardLimit(params.pageSize);
              if (params.search !== undefined) setWardSearch(params.search);
            }}
            rowCount={wardData?.total ?? 0}
            onRefresh={() => utils.viewer.divisions.listWards.invalidate()}
            toolbarLeading={
              <SearchableSelect
                placeholder={t("divisions.selectProvince")}
                searchPlaceholder={t("divisions.searchProvincePlaceholder") || "Search province..."}
                value={selectedProvinceCode?.toString() ?? ""}
                onValueChange={(val) => {
                  if (val) {
                    const code = parseInt(val, 10);
                    const name = allProvincesData?.items.find((p) => p.code === code)?.name ?? "";
                    setSelectedProvinceCode(code);
                    setSelectedProvinceName(name);
                  } else {
                    setSelectedProvinceCode(undefined);
                    setSelectedProvinceName("");
                  }
                  setWardPage(1);
                }}
                options={provinceOptions}
                className="h-8 w-[220px] text-sm py-0"
                allowClear
                maxHeight="280px"
              />
            }
          />
        </TabsContent>
      </Tabs>

      {/* --- PROVINCE SHEET DRAWER (Sliding from Right) --- */}
      <Sheet open={provDrawerOpen} onOpenChange={setProvDrawerOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[480px]">
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle>
              {provEditingId
                ? t("divisions.updateProvinceTitle")
                : t("divisions.createProvinceTitle")}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleProvSubmit} className="flex flex-1 flex-col overflow-hidden">
            <PerfectScroll className="flex flex-1 flex-col px-6 py-6 overflow-y-auto">
              <div className="flex flex-col gap-5 pb-6">
                {/* Name */}
                <div className="grid gap-2">
                  <Label htmlFor="provName" className="text-sm font-semibold text-sys-primary">
                    {t("divisions.lblName")} <span className="text-sys-dangerous">*</span>
                  </Label>
                  <Input
                    id="provName"
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    placeholder={t("divisions.placeholderName")}
                    required
                  />
                </div>

                {/* Code */}
                <div className="grid gap-2">
                  <Label htmlFor="provCode" className="text-sm font-semibold text-sys-primary">
                    {t("divisions.lblCode")} <span className="text-sys-dangerous">*</span>
                  </Label>
                  <Input
                    id="provCode"
                    type="number"
                    value={provCode}
                    onChange={(e) => setProvCode(e.target.value)}
                    placeholder={t("divisions.placeholderCode")}
                    required
                    disabled={!!provEditingId}
                  />
                </div>

                {/* Division Type */}
                <div className="grid gap-2">
                  <Label htmlFor="provDivType" className="text-sm font-semibold text-sys-primary">
                    {t("divisions.lblDivisionType")}
                  </Label>
                  <Select value={provDivisionType} onValueChange={setProvDivisionType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("divisions.placeholderDivisionType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tỉnh">tỉnh</SelectItem>
                      <SelectItem value="thành phố trung ương">thành phố trung ương</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* CodeName */}
                <div className="grid gap-2">
                  <Label htmlFor="provCodeName" className="text-sm font-semibold text-sys-primary">
                    {t("divisions.lblCodeName")}
                  </Label>
                  <Input
                    id="provCodeName"
                    value={provCodeName}
                    onChange={(e) => setProvCodeName(e.target.value)}
                    placeholder={t("divisions.placeholderCodeName")}
                  />
                </div>

                {/* Phone Code */}
                <div className="grid gap-2">
                  <Label htmlFor="provPhoneCode" className="text-sm font-semibold text-sys-primary">
                    {t("divisions.lblPhoneCode")} <span className="text-sys-dangerous">*</span>
                  </Label>
                  <Input
                    id="provPhoneCode"
                    type="number"
                    value={provPhoneCode}
                    onChange={(e) => setProvPhoneCode(e.target.value)}
                    placeholder={t("divisions.placeholderPhoneCode")}
                    required
                  />
                </div>
              </div>

              {/* Footer buttons */}
              <div className="mt-auto flex gap-3 border-t border-border pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setProvDrawerOpen(false)}
                >
                  {t("packing.cancel")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:opacity-90 transition-opacity"
                  disabled={createProvMut.isPending || updateProvMut.isPending}
                >
                  {t("packing.save")}
                </Button>
              </div>
            </PerfectScroll>
          </form>
        </SheetContent>
      </Sheet>

      {/* --- WARD SHEET DRAWER (Sliding from Right) --- */}
      <Sheet open={wardDrawerOpen} onOpenChange={setWardDrawerOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[480px]">
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle>
              {wardEditingId ? t("divisions.updateWardTitle") : t("divisions.createWardTitle")}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleWardSubmit} className="flex flex-1 flex-col overflow-hidden">
            <PerfectScroll className="flex flex-1 flex-col px-6 py-6 overflow-y-auto">
              <div className="flex flex-col gap-5 pb-6">
                {/* Name */}
                <div className="grid gap-2">
                  <Label htmlFor="wardName" className="text-sm font-semibold text-sys-primary">
                    {t("divisions.lblName")} <span className="text-sys-dangerous">*</span>
                  </Label>
                  <Input
                    id="wardName"
                    value={wardName}
                    onChange={(e) => setWardName(e.target.value)}
                    placeholder={t("divisions.placeholderName")}
                    required
                  />
                </div>

                {/* Code */}
                <div className="grid gap-2">
                  <Label htmlFor="wardCode" className="text-sm font-semibold text-sys-primary">
                    {t("divisions.lblCode")} <span className="text-sys-dangerous">*</span>
                  </Label>
                  <Input
                    id="wardCode"
                    type="number"
                    value={wardCode}
                    onChange={(e) => setWardCode(e.target.value)}
                    placeholder={t("divisions.placeholderCode")}
                    required
                    disabled={!!wardEditingId}
                  />
                </div>

                {/* Division Type */}
                <div className="grid gap-2">
                  <Label htmlFor="wardDivType" className="text-sm font-semibold text-sys-primary">
                    {t("divisions.lblDivisionType")}
                  </Label>
                  <Select value={wardDivisionType} onValueChange={setWardDivisionType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("divisions.placeholderDivisionType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phường">phường</SelectItem>
                      <SelectItem value="xã">xã</SelectItem>
                      <SelectItem value="đặc khu">đặc khu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* CodeName */}
                <div className="grid gap-2">
                  <Label htmlFor="wardCodeName" className="text-sm font-semibold text-sys-primary">
                    {t("divisions.lblCodeName")}
                  </Label>
                  <Input
                    id="wardCodeName"
                    value={wardCodeName}
                    onChange={(e) => setWardCodeName(e.target.value)}
                    placeholder={t("divisions.placeholderCodeName")}
                  />
                </div>

                {/* Province Code selector */}
                <div className="grid gap-2">
                  <Label
                    htmlFor="wardProvinceCode"
                    className="text-sm font-semibold text-sys-primary"
                  >
                    {t("divisions.lblProvince")} <span className="text-sys-dangerous">*</span>
                  </Label>
                  <Select value={wardProvinceCode} onValueChange={setWardProvinceCode}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("divisions.selectProvince")} />
                    </SelectTrigger>
                    <SelectContent>
                      {allProvincesData?.items.map((prov) => (
                        <SelectItem key={prov.code} value={prov.code.toString()}>
                          {prov.name} ({prov.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Footer buttons */}
              <div className="mt-auto flex gap-3 border-t border-border pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setWardDrawerOpen(false)}
                >
                  {t("packing.cancel")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:opacity-90 transition-opacity"
                  disabled={createWardMut.isPending || updateWardMut.isPending}
                >
                  {t("packing.save")}
                </Button>
              </div>
            </PerfectScroll>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
