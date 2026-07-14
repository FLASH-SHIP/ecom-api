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

type StateRow = {
  id: number;
  code: string;
  name: string;
  divisionType: string;
  isActive: boolean;
};

type CityRow = {
  id: number;
  code: string;
  name: string;
  divisionType: string;
  stateName: string;
  parentId: number | null;
};

export default function UsDivisionsContent() {
  const t = useTranslations("settings");
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Tab State
  const [activeTab, setActiveTab] = useState<string>("states");

  // Selected State for filtering Cities
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);
  const [selectedStateName, setSelectedStateName] = useState<string>("");

  // State Table State
  const [stateSearch, setStateSearch] = useState("");
  const debouncedStateSearch = useDebounce(stateSearch, 300);
  const [statePage, setStatePage] = useState(1);
  const [stateLimit, setStateLimit] = useState(10);

  // City Table State
  const [citySearch, setCitySearch] = useState("");
  const debouncedCitySearch = useDebounce(citySearch, 300);
  const [cityPage, setCityPage] = useState(1);
  const [cityLimit, setCityLimit] = useState(10);

  // Drawers State
  const [stateDrawerOpen, setStateDrawerOpen] = useState(false);
  const [stateEditingId, setStateEditingId] = useState<number | null>(null);

  const [cityDrawerOpen, setCityDrawerOpen] = useState(false);
  const [cityEditingId, setCityEditingId] = useState<number | null>(null);

  // State Form Fields
  const [stateName, setStateName] = useState("");
  const [stateCode, setStateCode] = useState("");

  // City Form Fields
  const [cityName, setCityName] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [cityParentId, setCityParentId] = useState<string>("");

  // Fetch all states for dropdown
  const { data: allStatesData } = trpc.viewer.divisions.listDivisions.useQuery({
    countryCode: "US",
    level: 1,
    limit: 100,
  });

  // Queries
  const {
    data: stateData,
    isLoading: stateLoading,
    isFetching: stateFetching,
  } = trpc.viewer.divisions.listDivisions.useQuery({
    countryCode: "US",
    level: 1,
    search: debouncedStateSearch || undefined,
    page: statePage,
    limit: stateLimit,
  });

  const {
    data: cityData,
    isLoading: cityLoading,
    isFetching: cityFetching,
  } = trpc.viewer.divisions.listDivisions.useQuery({
    countryCode: "US",
    level: 2,
    parentId: selectedStateId,
    search: debouncedCitySearch || undefined,
    page: cityPage,
    limit: cityLimit,
  });

  // Mutations
  const createStateMut = trpc.viewer.divisions.createDivision.useMutation({
    onSuccess: () => {
      toast(t("usDivisions.toastCreateStateSuccess"), "success");
      setStateDrawerOpen(false);
      utils.viewer.divisions.listDivisions.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateStateMut = trpc.viewer.divisions.updateDivision.useMutation({
    onSuccess: () => {
      toast(t("usDivisions.toastUpdateStateSuccess"), "success");
      setStateDrawerOpen(false);
      utils.viewer.divisions.listDivisions.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const createCityMut = trpc.viewer.divisions.createDivision.useMutation({
    onSuccess: () => {
      toast(t("usDivisions.toastCreateCitySuccess"), "success");
      setCityDrawerOpen(false);
      utils.viewer.divisions.listDivisions.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateCityMut = trpc.viewer.divisions.updateDivision.useMutation({
    onSuccess: () => {
      toast(t("usDivisions.toastUpdateCitySuccess"), "success");
      setCityDrawerOpen(false);
      utils.viewer.divisions.listDivisions.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  // Data mapping
  const stateRows: StateRow[] = useMemo(() => {
    if (!stateData?.items) return [];
    return stateData.items.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      divisionType: s.divisionType,
      isActive: s.isActive,
    }));
  }, [stateData]);

  const stateFilterOptions = useMemo(() => {
    const opts = [{ value: "", label: t("usDivisions.allStates") }];
    if (allStatesData?.items) {
      for (const s of allStatesData.items) {
        opts.push({ value: s.id.toString(), label: `${s.name} (${s.code})` });
      }
    }
    return opts;
  }, [allStatesData, t]);

  const cityRows: CityRow[] = useMemo(() => {
    if (!cityData?.items) return [];
    return cityData.items.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      divisionType: c.divisionType,
      stateName: c.parent?.name ?? "",
      parentId: c.parentId,
    }));
  }, [cityData]);

  // State Form Actions
  const openCreateState = () => {
    setStateEditingId(null);
    setStateName("");
    setStateCode("");
    setStateDrawerOpen(true);
  };

  const openEditState = useCallback(
    async (id: number) => {
      setStateEditingId(id);
      try {
        const s = await utils.client.viewer.divisions.getDivision.query({ id });
        setStateName(s.name);
        setStateCode(s.code);
        setStateDrawerOpen(true);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        toast(message, "error");
      }
    },
    [utils, toast],
  );

  const handleStateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stateName.trim()) return toast(t("usDivisions.validationRequired"), "error");
    if (!stateCode.trim()) return toast(t("usDivisions.validationRequired"), "error");

    if (stateEditingId) {
      updateStateMut.mutate({ id: stateEditingId, name: stateName });
    } else {
      createStateMut.mutate({
        countryCode: "US",
        code: stateCode.toUpperCase(),
        name: stateName,
        divisionType: "state",
        level: 1,
      });
    }
  };

  // City Form Actions
  const openCreateCity = () => {
    setCityEditingId(null);
    setCityName("");
    setCityCode("");
    setCityParentId(selectedStateId ? selectedStateId.toString() : "");
    setCityDrawerOpen(true);
  };

  const openEditCity = useCallback(
    async (id: number) => {
      setCityEditingId(id);
      try {
        const c = await utils.client.viewer.divisions.getDivision.query({ id });
        setCityName(c.name);
        setCityCode(c.code);
        setCityParentId(c.parentId ? c.parentId.toString() : "");
        setCityDrawerOpen(true);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        toast(message, "error");
      }
    },
    [utils, toast],
  );

  const handleCitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName.trim()) return toast(t("usDivisions.validationRequired"), "error");
    if (!cityCode.trim()) return toast(t("usDivisions.validationRequired"), "error");
    if (!cityParentId) return toast(t("usDivisions.validationRequired"), "error");

    const parentId = parseInt(cityParentId, 10);
    if (Number.isNaN(parentId)) return toast(t("usDivisions.validationRequired"), "error");

    if (cityEditingId) {
      updateCityMut.mutate({ id: cityEditingId, name: cityName });
    } else {
      createCityMut.mutate({
        countryCode: "US",
        code: cityCode,
        name: cityName,
        divisionType: "city",
        level: 2,
        parentId,
      });
    }
  };

  // State Columns
  const stateColumns: ColumnDef<StateRow>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: t("usDivisions.colCode"),
        size: 80,
      },
      {
        accessorKey: "name",
        header: t("usDivisions.colName"),
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer text-sm font-semibold hover:text-primary transition-colors text-left text-foreground"
            onClick={() => {
              setSelectedStateId(row.original.id);
              setSelectedStateName(row.original.name);
              setCityPage(1);
              setActiveTab("cities");
            }}
            title="Click to view Cities"
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: "divisionType",
        header: t("usDivisions.colDivisionType"),
        size: 120,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground capitalize">
            {row.original.divisionType}
          </span>
        ),
      },
    ],
    [t],
  );

  // City Columns
  const cityColumns: ColumnDef<CityRow>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: t("usDivisions.colCode"),
        size: 160,
      },
      {
        accessorKey: "name",
        header: t("usDivisions.colName"),
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-foreground">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "divisionType",
        header: t("usDivisions.colDivisionType"),
        size: 120,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground capitalize">
            {row.original.divisionType}
          </span>
        ),
      },
      {
        accessorKey: "stateName",
        header: t("usDivisions.colState"),
        size: 140,
      },
    ],
    [t],
  );

  // Row Actions
  const stateRowActions: RowAction<StateRow>[] = useMemo(
    () => [
      {
        key: "edit",
        tooltip: t("usDivisions.editState"),
        icon: <Pencil size={15} />,
        color: "success",
        onClick: (row) => openEditState(row.id),
      },
    ],
    [openEditState, t],
  );

  const cityRowActions: RowAction<CityRow>[] = useMemo(
    () => [
      {
        key: "edit",
        tooltip: t("usDivisions.editCity"),
        icon: <Pencil size={15} />,
        color: "success",
        onClick: (row) => openEditCity(row.id),
      },
    ],
    [openEditCity, t],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col">
        <PageBreadcrumb className="mb-2" />
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {activeTab === "states" ? t("usDivisions.stateList") : t("usDivisions.cityList")}
          </h1>
          {activeTab === "states" ? (
            <Button
              size="sm"
              className="bg-primary hover:opacity-90 transition-opacity self-end sm:self-auto"
              onClick={openCreateState}
            >
              <Plus className="mr-1.5 size-4" />
              {t("usDivisions.addState")}
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-primary hover:opacity-90 transition-opacity self-end sm:self-auto"
              onClick={openCreateCity}
            >
              <Plus className="mr-1.5 size-4" />
              {t("usDivisions.addCity")}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
          <TabsTrigger value="states">{t("usDivisions.statesTab")}</TabsTrigger>
          <TabsTrigger value="cities">{t("usDivisions.citiesTab")}</TabsTrigger>
        </TabsList>

        {/* Tab 1: States */}
        <TabsContent value="states">
          <DataTable<StateRow>
            tableKey="admin-us-states"
            defaultPageSize={stateLimit}
            defaultPage={statePage}
            data={stateRows}
            columns={stateColumns}
            rowActions={stateRowActions}
            isLoading={stateLoading}
            isFetching={stateFetching}
            onServerChange={(params) => {
              if (params.page !== undefined) setStatePage(params.page);
              if (params.pageSize !== undefined) setStateLimit(params.pageSize);
              if (params.search !== undefined) setStateSearch(params.search);
            }}
            rowCount={stateData?.total ?? 0}
            onRefresh={() => utils.viewer.divisions.listDivisions.invalidate()}
          />
        </TabsContent>

        {/* Tab 2: Cities */}
        <TabsContent value="cities">
          <DataTable<CityRow>
            tableKey="admin-us-cities"
            defaultPageSize={cityLimit}
            defaultPage={cityPage}
            data={cityRows}
            columns={cityColumns}
            rowActions={cityRowActions}
            isLoading={cityLoading}
            isFetching={cityFetching}
            onServerChange={(params) => {
              if (params.page !== undefined) setCityPage(params.page);
              if (params.pageSize !== undefined) setCityLimit(params.pageSize);
              if (params.search !== undefined) setCitySearch(params.search);
            }}
            rowCount={cityData?.total ?? 0}
            onRefresh={() => utils.viewer.divisions.listDivisions.invalidate()}
            toolbarLeading={
              <SearchableSelect
                value={selectedStateId ? selectedStateId.toString() : ""}
                onValueChange={(val) => {
                  if (!val) {
                    setSelectedStateId(undefined);
                    setSelectedStateName("");
                  } else {
                    const stateId = parseInt(val, 10);
                    setSelectedStateId(stateId);
                    const found = allStatesData?.items.find((s) => s.id === stateId);
                    setSelectedStateName(found?.name ?? "");
                  }
                  setCityPage(1);
                }}
                options={stateFilterOptions}
                placeholder={t("usDivisions.selectState")}
                searchPlaceholder={t("usDivisions.searchState")}
                className="h-8 w-[220px] text-sm py-0"
                allowClear
                maxHeight="280px"
              />
            }
          />
        </TabsContent>
      </Tabs>

      {/* --- STATE SHEET DRAWER --- */}
      <Sheet open={stateDrawerOpen} onOpenChange={setStateDrawerOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[480px]">
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle>
              {stateEditingId
                ? t("usDivisions.updateStateTitle")
                : t("usDivisions.createStateTitle")}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleStateSubmit} className="flex flex-1 flex-col overflow-hidden">
            <PerfectScroll className="flex flex-1 flex-col px-6 py-6 overflow-y-auto">
              <div className="flex flex-col gap-5 pb-6">
                {/* Name */}
                <div className="grid gap-2">
                  <Label htmlFor="stateName" className="text-sm font-semibold text-sys-primary">
                    {t("usDivisions.lblName")} <span className="text-sys-dangerous">*</span>
                  </Label>
                  <Input
                    id="stateName"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder={t("usDivisions.placeholderName")}
                    required
                  />
                </div>

                {/* Code */}
                <div className="grid gap-2">
                  <Label htmlFor="stateCode" className="text-sm font-semibold text-sys-primary">
                    {t("usDivisions.lblCode")} <span className="text-sys-dangerous">*</span>
                  </Label>
                  <Input
                    id="stateCode"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    placeholder={t("usDivisions.placeholderCode")}
                    required
                    disabled={!!stateEditingId}
                    maxLength={2}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto flex gap-3 border-t border-border pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStateDrawerOpen(false)}
                >
                  {t("packing.cancel")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:opacity-90 transition-opacity"
                  disabled={createStateMut.isPending || updateStateMut.isPending}
                >
                  {t("packing.save")}
                </Button>
              </div>
            </PerfectScroll>
          </form>
        </SheetContent>
      </Sheet>

      {/* --- CITY SHEET DRAWER --- */}
      <Sheet open={cityDrawerOpen} onOpenChange={setCityDrawerOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[480px]">
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle>
              {cityEditingId
                ? t("usDivisions.updateCityTitle")
                : t("usDivisions.createCityTitle")}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCitySubmit} className="flex flex-1 flex-col overflow-hidden">
            <PerfectScroll className="flex flex-1 flex-col px-6 py-6 overflow-y-auto">
              <div className="flex flex-col gap-5 pb-6">
                {/* Name */}
                <div className="grid gap-2">
                  <Label htmlFor="cityName" className="text-sm font-semibold text-sys-primary">
                    {t("usDivisions.lblName")} <span className="text-sys-dangerous">*</span>
                  </Label>
                  <Input
                    id="cityName"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder={t("usDivisions.placeholderCityName")}
                    required
                  />
                </div>

                {/* Code */}
                <div className="grid gap-2">
                  <Label htmlFor="cityCode" className="text-sm font-semibold text-sys-primary">
                    {t("usDivisions.lblCode")} <span className="text-sys-dangerous">*</span>
                  </Label>
                  <Input
                    id="cityCode"
                    value={cityCode}
                    onChange={(e) => setCityCode(e.target.value)}
                    placeholder={t("usDivisions.placeholderCityCode")}
                    required
                    disabled={!!cityEditingId}
                  />
                </div>

                {/* State selector */}
                <div className="grid gap-2">
                  <Label htmlFor="cityState" className="text-sm font-semibold text-sys-primary">
                    {t("usDivisions.lblState")} <span className="text-sys-dangerous">*</span>
                  </Label>
                  <Select value={cityParentId} onValueChange={setCityParentId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("usDivisions.selectState")} />
                    </SelectTrigger>
                    <SelectContent>
                      {allStatesData?.items.map((state) => (
                        <SelectItem key={state.id} value={state.id.toString()}>
                          {state.name} ({state.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto flex gap-3 border-t border-border pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCityDrawerOpen(false)}
                >
                  {t("packing.cancel")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:opacity-90 transition-opacity"
                  disabled={createCityMut.isPending || updateCityMut.isPending}
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
