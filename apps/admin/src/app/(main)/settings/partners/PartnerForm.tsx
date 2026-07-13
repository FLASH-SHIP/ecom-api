"use client";

import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { PartnerStatus, ServiceType } from "@ecom/types";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ecom/ui/components/dialog";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ecom/ui/components/tabs";
import { Textarea } from "@ecom/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Info,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

interface PartnerFormProps {
  partnerId: number | null;
}

interface PartnerFormState {
  code: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: PartnerStatus;
  description?: string;
}

const INITIAL_FORM_STATE: PartnerFormState = {
  code: "",
  name: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  status: PartnerStatus.ACTIVE,
  description: "",
};

const partnerFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã đối tác phải từ 2 ký tự trở lên.")
    .max(50, "Mã đối tác tối đa 50 ký tự.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Mã đối tác chỉ chứa chữ, số, gạch ngang và gạch dưới."),
  name: z
    .string()
    .trim()
    .min(2, "Tên đối tác phải từ 2 ký tự trở lên.")
    .max(100, "Tên đối tác tối đa 100 ký tự."),
  contactName: z.string().trim().optional(),
  contactEmail: z.string().trim().optional().or(z.literal("")),
  contactPhone: z.string().trim().optional(),
  status: z.nativeEnum(PartnerStatus),
  description: z.string().trim().optional(),
});

type ServiceFormState = {
  code: string;
  name: string;
  type: ServiceType;
  isActive: boolean;
  webhookSecret: string;
  timeoutMs: number;
  rateLimitPerMinute: number;
};

interface PairItem {
  id: string;
  key: string;
  value: string;
}

interface ServiceItem {
  id: number;
  code: string;
  name: string;
  type: ServiceType;
  isActive: boolean;
  webhookSecret?: string | null;
  timeoutMs: number;
  rateLimitPerMinute: number;
  statusMapping?: unknown | null;
}

const SERVICE_TYPE_STYLES = {
  [ServiceType.PICKUP]: {
    labelKey: "partners.services.typePickup",
    colorClass: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  [ServiceType.EXPORT]: {
    labelKey: "partners.services.typeExport",
    colorClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  [ServiceType.IMPORT]: {
    labelKey: "partners.services.typeImport",
    colorClass: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  [ServiceType.LASTMILE]: {
    labelKey: "partners.services.typeLastMile",
    colorClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Component contains nested forms and multiple tabs
export function PartnerForm({ partnerId }: PartnerFormProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { toast } = useToast();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<string>("general");
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

  // Dialog form state
  const [serviceForm, setServiceForm] = useState<ServiceFormState>({
    code: "",
    name: "",
    type: ServiceType.LASTMILE,
    isActive: true,
    webhookSecret: "",
    timeoutMs: 10000,
    rateLimitPerMinute: 60,
  });

  const [apiConfigPairs, setApiConfigPairs] = useState<PairItem[]>([
    { id: Math.random().toString(), key: "", value: "" },
  ]);
  const [statusMappingPairs, setStatusMappingPairs] = useState<PairItem[]>([
    { id: Math.random().toString(), key: "", value: "" },
  ]);

  const [isTestingConn, setIsTestingConn] = useState(false);

  const isCreate = partnerId === null;

  // React Hook Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PartnerFormState>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: INITIAL_FORM_STATE,
  });

  // Queries
  const { data: partnerData, isLoading: isPartnerLoading } = trpc.viewer.partners.get.useQuery(
    { id: partnerId as number },
    { enabled: !isCreate, retry: false },
  );

  const { data: services, refetch: refetchServices } = trpc.viewer.partners.listServices.useQuery(
    { partnerId: partnerId as number },
    { enabled: !isCreate },
  );

  // Mutations
  const createMut = trpc.viewer.partners.create.useMutation({
    onSuccess: (newPartner) => {
      toast(t("partners.toastCreateSuccess"), "success");
      router.push(`/settings/partners/${newPartner.id}/edit?tab=services`);
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateMut = trpc.viewer.partners.update.useMutation({
    onSuccess: () => {
      toast(t("partners.toastUpdateSuccess"), "success");
      utils.viewer.partners.get.invalidate({ id: partnerId as number });
    },
    onError: (err) => toast(err.message, "error"),
  });

  const addServiceMut = trpc.viewer.partners.addService.useMutation({
    onSuccess: () => {
      toast(t("partners.services.toastCreateSuccess"), "success");
      setIsServiceDialogOpen(false);
      refetchServices();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateServiceMut = trpc.viewer.partners.updateService.useMutation({
    onSuccess: () => {
      toast(t("partners.services.toastUpdateSuccess"), "success");
      setIsServiceDialogOpen(false);
      refetchServices();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const deleteServiceMut = trpc.viewer.partners.deleteService.useMutation({
    onSuccess: () => {
      toast(t("partners.services.toastDeleteSuccess"), "success");
      refetchServices();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const testConnMut = trpc.viewer.partners.testConnection.useMutation();

  // Populate general info
  useEffect(() => {
    if (partnerData) {
      reset({
        code: partnerData.code,
        name: partnerData.name,
        contactName: partnerData.contactName ?? "",
        contactEmail: partnerData.contactEmail ?? "",
        contactPhone: partnerData.contactPhone ?? "",
        status: partnerData.status,
        description: partnerData.description ?? "",
      });

      // Populate API config key-values for the Partner
      const configEntries = Object.entries(
        (partnerData.apiConfig as Record<string, unknown>) || {},
      );
      if (configEntries.length > 0) {
        setApiConfigPairs(
          configEntries.map(([key, value]) => ({
            id: Math.random().toString(),
            key,
            value: String(value),
          })),
        );
      } else {
        setApiConfigPairs([{ id: Math.random().toString(), key: "", value: "" }]);
      }
    }
  }, [partnerData, reset]);

  // Helper for config conversions
  const getApiConfigObject = () => {
    const config: Record<string, string> = {};
    for (const pair of apiConfigPairs) {
      if (pair.key.trim()) {
        config[pair.key.trim()] = pair.value;
      }
    }
    return config;
  };

  const getStatusMappingObject = () => {
    const mapping: Record<string, string> = {};
    for (const pair of statusMappingPairs) {
      if (pair.key.trim()) {
        mapping[pair.key.trim()] = pair.value;
      }
    }
    return mapping;
  };

  // Form Submit
  const onSubmitForm = async (data: PartnerFormState) => {
    const apiConfig = getApiConfigObject();
    const payload = {
      ...data,
      apiConfig: Object.keys(apiConfig).length > 0 ? apiConfig : null,
    };

    if (isCreate) {
      await createMut.mutateAsync(payload);
    } else {
      await updateMut.mutateAsync({ id: partnerId as number, ...payload });
    }
  };

  const handleBack = () => {
    router.push("/settings/partners");
  };

  // Webhook display computation
  const getWebhookUrl = (serviceId: number | string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return `${baseUrl}/api/v2/webhooks/carriers/${serviceId}`;
  };

  // Connection validation trigger at Partner level
  const handleTestConnection = async () => {
    if (isCreate) return;
    setIsTestingConn(true);
    try {
      const config = getApiConfigObject();
      const res = await testConnMut.mutateAsync({
        id: partnerId as number,
        tempConfig: config,
      });
      if (res.success) {
        toast(res.message, "success");
      } else {
        toast(t("partners.services.toastTestConnectionFailed", { message: res.message }), "error");
      }
    } catch (err: unknown) {
      toast((err as Error).message || "Kết nối lỗi", "error");
    } finally {
      setIsTestingConn(false);
    }
  };

  // Service CRUD modal controls
  const openAddService = () => {
    setEditingServiceId(null);
    setServiceForm({
      code: "",
      name: "",
      type: ServiceType.LASTMILE,
      isActive: true,
      webhookSecret: "",
      timeoutMs: 10000,
      rateLimitPerMinute: 60,
    });
    setStatusMappingPairs([{ id: Math.random().toString(), key: "", value: "" }]);
    setIsServiceDialogOpen(true);
  };

  const openEditService = (service: ServiceItem) => {
    setEditingServiceId(service.id);
    setServiceForm({
      code: service.code,
      name: service.name,
      type: service.type,
      isActive: service.isActive,
      webhookSecret: service.webhookSecret ?? "",
      timeoutMs: service.timeoutMs,
      rateLimitPerMinute: service.rateLimitPerMinute,
    });

    // Populate Status Mapping key-values
    const mappingEntries = Object.entries((service.statusMapping as Record<string, unknown>) || {});
    if (mappingEntries.length > 0) {
      setStatusMappingPairs(
        mappingEntries.map(([key, value]) => ({
          id: Math.random().toString(),
          key,
          value: String(value),
        })),
      );
    } else {
      setStatusMappingPairs([{ id: Math.random().toString(), key: "", value: "" }]);
    }

    setIsServiceDialogOpen(true);
  };

  const saveService = async () => {
    if (!serviceForm.code.trim() || !serviceForm.name.trim()) {
      toast("Vui lòng điền mã và tên dịch vụ.", "error");
      return;
    }

    const statusMapping = getStatusMappingObject();

    const payload = {
      ...serviceForm,
      statusMapping: Object.keys(statusMapping).length > 0 ? statusMapping : null,
      webhookSecret: serviceForm.webhookSecret.trim() || null,
    };

    if (editingServiceId) {
      await updateServiceMut.mutateAsync({ id: editingServiceId, ...payload });
    } else {
      await addServiceMut.mutateAsync({ partnerId: partnerId as number, ...payload });
    }
  };

  const deleteService = (id: number, codeStr: string) => {
    askConfirm({
      message: t("partners.services.confirmDelete", { code: codeStr }),
      onConfirm: () => deleteServiceMut.mutate({ id }),
    });
  };

  const addConfigPair = () =>
    setApiConfigPairs([...apiConfigPairs, { id: Math.random().toString(), key: "", value: "" }]);
  const removeConfigPair = (idx: number) => {
    const next = [...apiConfigPairs];
    next.splice(idx, 1);
    setApiConfigPairs(
      next.length === 0 ? [{ id: Math.random().toString(), key: "", value: "" }] : next,
    );
  };

  const addMappingPair = () =>
    setStatusMappingPairs([
      ...statusMappingPairs,
      { id: Math.random().toString(), key: "", value: "" },
    ]);
  const removeMappingPair = (idx: number) => {
    const next = [...statusMappingPairs];
    next.splice(idx, 1);
    setStatusMappingPairs(
      next.length === 0 ? [{ id: Math.random().toString(), key: "", value: "" }] : next,
    );
  };

  if (!isCreate && isPartnerLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const codeStr = watch("code");

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {isCreate ? t("partners.createTitle") : t("partners.editTitle", { code: codeStr })}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isCreate ? t("partners.createSubtitle") : t("partners.editSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBack}>
            {t("partners.btnBack")}
          </Button>
        </div>
      </div>

      {/* Main Tab Panels */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="general">{t("partners.tabGeneral")}</TabsTrigger>
          <TabsTrigger value="services" disabled={isCreate}>
            {t("partners.tabServices")}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General configuration */}
        <TabsContent value="general" className="mt-4 flex flex-col gap-5">
          <Card>
            <CardContent className="pt-6 flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="code" className="font-semibold text-xs">
                    {t("partners.lblCode")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="code"
                    {...register("code")}
                    disabled={!isCreate}
                    placeholder="E.g. USPS"
                    className={
                      errors.code ? "border-destructive focus-visible:ring-destructive" : ""
                    }
                  />
                  {errors.code && (
                    <span className="text-[11px] text-destructive font-medium mt-0.5">
                      {errors.code.message}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name" className="font-semibold text-xs">
                    {t("partners.lblName")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="E.g. USPS Logistics"
                    className={
                      errors.name ? "border-destructive focus-visible:ring-destructive" : ""
                    }
                  />
                  {errors.name && (
                    <span className="text-[11px] text-destructive font-medium mt-0.5">
                      {errors.name.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contactName" className="font-semibold text-xs">
                    {t("partners.lblContactName")}
                  </Label>
                  <Input
                    id="contactName"
                    {...register("contactName")}
                    placeholder="E.g. John Doe"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contactEmail" className="font-semibold text-xs">
                    {t("partners.lblContactEmail")}
                  </Label>
                  <Input
                    id="contactEmail"
                    {...register("contactEmail")}
                    placeholder="E.g. representative@carrier.com"
                    className={
                      errors.contactEmail ? "border-destructive focus-visible:ring-destructive" : ""
                    }
                  />
                  {errors.contactEmail && (
                    <span className="text-[11px] text-destructive font-medium mt-0.5">
                      {errors.contactEmail.message}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contactPhone" className="font-semibold text-xs">
                    {t("partners.lblContactPhone")}
                  </Label>
                  <Input
                    id="contactPhone"
                    {...register("contactPhone")}
                    placeholder="E.g. +1 800..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="font-semibold text-xs">{t("partners.lblStatus")}</Label>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PartnerStatus.ACTIVE}>
                            {t("partners.statusActive")}
                          </SelectItem>
                          <SelectItem value={PartnerStatus.INACTIVE}>
                            {t("partners.statusInactive")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="font-semibold text-xs">Khâu logistics hỗ trợ</Label>
                  <div className="flex flex-wrap gap-1.5 min-h-[38px] items-center">
                    {isCreate ? (
                      <span className="text-xs text-muted-foreground italic">
                        Chưa cấu hình dịch vụ
                      </span>
                    ) : services && services.length > 0 ? (
                      Array.from(new Set(services.map((s) => s.type))).map((type) => {
                        const style = SERVICE_TYPE_STYLES[type];
                        const label = style ? t(style.labelKey) : type;
                        const colorClass = style
                          ? style.colorClass
                          : "bg-muted text-muted-foreground border-border";
                        return (
                          <span
                            key={type}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${colorClass}`}
                          >
                            {label}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Chưa cấu hình dịch vụ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description" className="font-semibold text-xs">
                  {t("partners.lblDescription")}
                </Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Ghi chú thêm về năng lực, địa chỉ tổng kho, phương thức bàn giao..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Connection Parameters & Sandbox Toggle moved here */}
          <Card>
            <CardContent className="pt-6 flex flex-col gap-5 text-xs">
              <h3 className="text-sm font-bold border-b border-border pb-2">
                Cấu hình kết nối API
              </h3>

              {/* API Endpoint and credentials configuration */}

              <div className="flex flex-col gap-2 border border-border p-3 rounded">
                <div className="flex justify-between items-center mb-1">
                  <Label className="font-bold">{t("partners.services.lblApiConfig")}</Label>
                  <Button size="sm" variant="outline" className="h-6 px-2" onClick={addConfigPair}>
                    <Plus className="size-3 mr-1" /> Thêm trường
                  </Button>
                </div>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {apiConfigPairs.map((pair, idx) => (
                    <div key={pair.id} className="flex gap-2 items-center">
                      <Input
                        placeholder="Key (E.g. apiKey)"
                        value={pair.key}
                        onChange={(e) => {
                          const next = [...apiConfigPairs];
                          const item = next[idx];
                          if (item) {
                            item.key = e.target.value;
                            setApiConfigPairs(next);
                          }
                        }}
                        className="h-8"
                      />
                      <Input
                        placeholder="Value"
                        value={pair.value}
                        onChange={(e) => {
                          const next = [...apiConfigPairs];
                          const item = next[idx];
                          if (item) {
                            item.value = e.target.value;
                            setApiConfigPairs(next);
                          }
                        }}
                        className="h-8"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive/5 shrink-0"
                        onClick={() => removeConfigPair(idx)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {!isCreate && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={isTestingConn}
                    className="h-8"
                  >
                    {isTestingConn ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 size-3.5" />
                    )}
                    {t("partners.services.btnTestConnection")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end mt-5">
            <Button
              type="button"
              onClick={handleSubmit(onSubmitForm)}
              disabled={isSubmitting || (!isCreate && !isDirty)}
              className="bg-primary text-primary-foreground h-9 px-4"
            >
              {isSubmitting ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 size-4" />
              )}
              {isCreate ? t("partners.btnCreate") : t("partners.btnSave")}
            </Button>
          </div>
        </TabsContent>

        {/* Tab 2: Integrated Carrier Services configuration */}
        <TabsContent value="services" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">{t("partners.tabServices")}</h3>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground h-8"
                  onClick={openAddService}
                >
                  <Plus className="mr-1.5 size-4" />
                  {t("partners.services.btnAddService")}
                </Button>
              </div>

              <div className="border border-border rounded-lg overflow-hidden bg-card text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="px-3 py-2.5 font-semibold text-muted-foreground w-36">
                        {t("partners.services.colCode")}
                      </th>
                      <th className="px-3 py-2.5 font-semibold text-muted-foreground w-48">
                        {t("partners.services.colName")}
                      </th>
                      <th className="px-3 py-2.5 font-semibold text-muted-foreground w-32">
                        {t("partners.services.colType")}
                      </th>
                      <th className="px-3 py-2.5 font-semibold text-muted-foreground w-24 text-center">
                        {t("partners.services.colStatus")}
                      </th>
                      <th className="px-3 py-2.5 w-20 text-center" />
                    </tr>
                  </thead>
                  <tbody>
                    {services && services.length > 0 ? (
                      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Services mapping contains multi-conditional translation badges
                      services.map((service) => {
                        let typeText: string = service.type;
                        if (service.type === ServiceType.PICKUP)
                          typeText = t("partners.services.typePickup");
                        if (service.type === ServiceType.EXPORT)
                          typeText = t("partners.services.typeExport");
                        if (service.type === ServiceType.IMPORT)
                          typeText = t("partners.services.typeImport");
                        if (service.type === ServiceType.LASTMILE)
                          typeText = t("partners.services.typeLastMile");

                        return (
                          <tr
                            key={service.id}
                            className="border-b border-border last:border-0 hover:bg-muted/10"
                          >
                            <td className="px-3 py-2 font-mono font-medium text-foreground">
                              {service.code}
                            </td>
                            <td className="px-3 py-2 font-medium">{service.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{typeText}</td>
                            <td className="px-3 py-2 text-center">
                              <Badge variant={service.isActive ? "default" : "outline"}>
                                {service.isActive
                                  ? t("partners.statusActive")
                                  : t("partners.statusInactive")}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1 justify-center">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 text-success border-success/30 hover:bg-success/5"
                                  onClick={() => openEditService(service as ServiceItem)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 text-destructive border-destructive/30 hover:bg-destructive/5"
                                  onClick={() => deleteService(service.id, service.code)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground italic">
                          {t("partners.services.noServices")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Service CRUD dialog */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingServiceId
                ? t("partners.services.dialogTitleEdit", { code: serviceForm.code })
                : t("partners.services.dialogTitleAdd")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-xs">
                  {t("partners.services.lblCode")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={serviceForm.code}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, code: e.target.value.toLowerCase() })
                  }
                  placeholder="E.g. usps_first_class"
                  disabled={editingServiceId !== null}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-xs">
                  {t("partners.services.lblName")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="E.g. USPS Ground Advantage"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-xs">{t("partners.services.lblType")}</Label>
                <Select
                  value={serviceForm.type}
                  onValueChange={(val) =>
                    setServiceForm({ ...serviceForm, type: val as ServiceType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ServiceType.PICKUP}>
                      {t("partners.services.typePickup")}
                    </SelectItem>
                    <SelectItem value={ServiceType.EXPORT}>
                      {t("partners.services.typeExport")}
                    </SelectItem>
                    <SelectItem value={ServiceType.IMPORT}>
                      {t("partners.services.typeImport")}
                    </SelectItem>
                    <SelectItem value={ServiceType.LASTMILE}>
                      {t("partners.services.typeLastMile")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-xs">{t("partners.services.lblTimeout")}</Label>
                <Input
                  type="number"
                  value={serviceForm.timeoutMs}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, timeoutMs: Number(e.target.value) })
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-xs">
                  {t("partners.services.lblRateLimit")}
                </Label>
                <Input
                  type="number"
                  value={serviceForm.rateLimitPerMinute}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, rateLimitPerMinute: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 items-center border border-border p-3 rounded bg-muted/10">
              <label className="flex items-center gap-2 cursor-pointer font-semibold select-none">
                <input
                  type="checkbox"
                  checked={serviceForm.isActive}
                  onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary size-4"
                />
                <span>{t("partners.services.lblIsActive")}</span>
              </label>
            </div>

            {/* Webhook display */}
            {editingServiceId && (
              <div className="flex flex-col gap-1.5 border border-border/80 p-3 rounded bg-blue-50/10">
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                  <Info className="size-3.5" />
                  <span>{t("partners.services.lblWebhookUrl")}</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={getWebhookUrl(editingServiceId)}
                    className="bg-muted font-mono text-[10px] h-8"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(getWebhookUrl(editingServiceId));
                      toast("Đã copy webhook URL", "success");
                    }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {t("partners.services.webhookUrlHelper")}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Label className="font-semibold text-xs">
                {t("partners.services.lblWebhookSecret")}
              </Label>
              <Input
                value={serviceForm.webhookSecret}
                onChange={(e) => setServiceForm({ ...serviceForm, webhookSecret: e.target.value })}
                placeholder="E.g. whsec_..."
              />
            </div>

            {/* Dynamic key-value editor for Status Mapping */}
            <div className="flex flex-col gap-2 border border-border p-3 rounded">
              <div className="flex justify-between items-center mb-1">
                <Label className="font-bold">{t("partners.services.lblStatusMapping")}</Label>
                <Button size="sm" variant="outline" className="h-6 px-2" onClick={addMappingPair}>
                  <Plus className="size-3 mr-1" /> Thêm ánh xạ
                </Button>
              </div>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {statusMappingPairs.map((pair, idx) => (
                  <div key={pair.id} className="flex gap-2 items-center">
                    <Input
                      placeholder="Carrier Code (E.g. ARR)"
                      value={pair.key}
                      onChange={(e) => {
                        const next = [...statusMappingPairs];
                        const item = next[idx];
                        if (item) {
                          item.key = e.target.value;
                          setStatusMappingPairs(next);
                        }
                      }}
                      className="h-8"
                    />
                    <Input
                      placeholder="Ecom Status (E.g. 4)"
                      value={pair.value}
                      onChange={(e) => {
                        const next = [...statusMappingPairs];
                        const item = next[idx];
                        if (item) {
                          item.value = e.target.value;
                          setStatusMappingPairs(next);
                        }
                      }}
                      className="h-8"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive/5 shrink-0"
                      onClick={() => removeMappingPair(idx)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsServiceDialogOpen(false)}>
              Hủy
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground" onClick={saveService}>
              {addServiceMut.isPending || updateServiceMut.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <CheckCircle className="mr-1.5 size-3.5" />
              )}
              Lưu dịch vụ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
