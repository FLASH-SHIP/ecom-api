"use client";

import { trpc } from "@admin/lib/trpc";
import type { OrderStatus } from "@ecom/prisma";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, PlusCircle, RefreshCw, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: necessary complexity for administrative order controls
export default function AdminOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const t = useTranslations("orders");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Status Change State
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Checkpoint Insertion State
  const [checkpointDesc, setCheckpointDesc] = useState("");
  const [checkpointLoc, setCheckpointLoc] = useState("");
  const [checkpointTime, setCheckpointTime] = useState(() => {
    // Current local ISO string rounded to minutes
    const now = new Date();
    now.setSeconds(0, 0);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [isAddingCheckpoint, setIsAddingCheckpoint] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Fetch details
  const {
    data: order,
    isLoading,
    refetch,
  } = trpc.viewer.orders.get.useQuery({ id }, { enabled: !!id });

  const trpcContext = trpc.useUtils();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "LABEL_CREATED":
        return <Badge variant="secondary">{t(`status.${status}`)}</Badge>;
      case "PENDING_LABEL":
        return <Badge variant="warning">{t(`status.${status}`)}</Badge>;
      case "PACKAGE_RECEIVED":
        return (
          <Badge variant="default" className="bg-[#0F798C] text-white border-none">
            {t(`status.${status}`)}
          </Badge>
        );
      case "ON_THE_WAY":
        return (
          <Badge variant="default" className="bg-blue-500 text-white border-none">
            {t(`status.${status}`)}
          </Badge>
        );
      case "PICK_UP":
        return (
          <Badge variant="default" className="bg-amber-500 text-white border-none">
            {t(`status.${status}`)}
          </Badge>
        );
      case "DELIVERY":
        return <Badge variant="success">{t(`status.${status}`)}</Badge>;
      default:
        return <Badge variant="default">{t(`status.${status}`)}</Badge>;
    }
  };

  // Mutate Order Status
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return;
    setError(null);
    setSuccess(null);
    setIsUpdatingStatus(true);

    try {
      await trpcContext.client.viewer.orders.updateStatus.mutate({
        id,
        status: newStatus as OrderStatus,
        metadata: statusNote.trim() ? { note: statusNote.trim() } : null,
        expectedVersion: order?.version,
      });
      setSuccess(t("statusUpdateSuccess"));
      setStatusNote("");
      refetch();
      trpcContext.viewer.orders.list.invalidate();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || t("statusUpdateError"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Mutate Checkpoint Timeline
  const handleAddCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointDesc.trim()) return;
    setError(null);
    setSuccess(null);
    setIsAddingCheckpoint(true);

    try {
      await trpcContext.client.viewer.orders.addCheckpoint.mutate({
        orderId: id,
        checkpointDate: new Date(checkpointTime),
        description: checkpointDesc.trim(),
        location: checkpointLoc.trim() || null,
      });
      setSuccess(t("addCheckpointSuccess"));
      setCheckpointDesc("");
      setCheckpointLoc("");
      refetch();
      trpcContext.viewer.orders.list.invalidate();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || t("addCheckpointError"));
    } finally {
      setIsAddingCheckpoint(false);
    }
  };

  const handleRecalculate = async (forceRefresh: boolean) => {
    setError(null);
    setSuccess(null);
    setIsRecalculating(true);

    try {
      await trpcContext.client.viewer.orders.recalculate.mutate({
        id,
        forceRefresh,
      });
      setSuccess(t("recalculateSuccess"));
      refetch();
      trpcContext.viewer.orders.list.invalidate();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || t("recalculateError"));
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col justify-center items-center gap-2">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F798C] border-t-transparent" />
        <span className="text-sm text-muted-foreground">{t("loadingDetails")}</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-12 text-center flex flex-col gap-4 items-center">
        <h2 className="text-xl font-bold">{t("notFound")}</h2>
        <p className="text-muted-foreground">{t("notFoundDesc")}</p>
        <Link href="/orders">
          <Button className="bg-[#0F798C] text-white">{t("backToList")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button
            variant="outline"
            size="icon"
            className="border-border hover:bg-accent cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {t("orderTitle")}: {order.orderCode}
            </h1>
            {getStatusBadge(order.status)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("createdAt")}: {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm:ss")} |{" "}
            {t("orderIdLabel")}: {order.id}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          className="ml-auto border-border hover:bg-accent cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {success && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Order Information */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* General and Shipping details */}
          <Card className="rounded-xl border border-border bg-card">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground mb-4">
                {t("generalAndShipping")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">{t("shippingMethod")}</span>
                  <span className="font-medium text-foreground">{order.shippingMethod}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">{t("shippingOrigin")}</span>
                  <span className="font-medium text-foreground">{order.shippingOrigin}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">{t("sellerOrderId")}</span>
                  <span className="font-medium text-foreground">{order.sellerOrderId || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">{t("importId")}</span>
                  <span className="font-medium text-foreground">{order.importId || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">{t("actualWeight")}</span>
                  <span className="font-medium text-foreground">{order.declaredWeight} gr</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">{t("volumeDimensions")}</span>
                  <span className="font-medium text-foreground">
                    {order.dimensionLength && order.dimensionWidth && order.dimensionHeight
                      ? `L ${order.dimensionLength} × W ${order.dimensionWidth} × H ${order.dimensionHeight} cm`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">{t("declaredValue")}</span>
                  <span className="font-medium text-foreground">${order.declaredValue}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">{t("hsCode")}</span>
                  <span className="font-medium text-foreground">
                    {order.products?.[0]?.hsCode || "-"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sender & Receiver Address Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-xl border border-border bg-card">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground mb-4">
                  {t("senderTitle")}
                </h3>
                <div className="text-sm font-medium text-foreground flex flex-col gap-1.5">
                  <div>
                    {t("detailSenderName")}: {order.senderName || "-"}
                  </div>
                  <div className="text-muted-foreground">
                    {t("detailSenderPhone")}: {order.senderPhone || "-"}
                  </div>
                  <div className="text-muted-foreground">
                    {t("detailSenderEmail")}: {order.senderEmail || "-"}
                  </div>
                  <div>
                    {t("detailSenderAddress")}: {order.senderAddress || "-"}
                  </div>
                  <div>
                    {order.senderCity}, {order.senderState}, {order.senderCountry} (
                    {order.senderZipCode})
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-card">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground mb-4">
                  {t("receiverTitle")}
                </h3>
                <div className="text-sm font-medium text-foreground flex flex-col gap-1.5">
                  <div>
                    {t("detailReceiverName")}: {order.receiverName}
                  </div>
                  <div className="text-muted-foreground">
                    {t("detailReceiverPhone")}: {order.receiverPhone || "-"}
                  </div>
                  <div className="text-muted-foreground">
                    {t("detailReceiverEmail")}: {order.receiverEmail || "-"}
                  </div>
                  <div>
                    {t("detailReceiverAddress1")}: {order.receiverAddress1}
                  </div>
                  {order.receiverAddress2 && (
                    <div>
                      {t("detailReceiverAddress2")}: {order.receiverAddress2}
                    </div>
                  )}
                  <div>
                    {order.receiverCity}, {order.receiverState}, {order.receiverCountry} (
                    {order.receiverZipCode})
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing calculations */}
          <Card className="rounded-xl border border-border bg-card">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-3 mb-4 gap-3">
                <h3 className="font-bold text-lg text-foreground">{t("pricingInfo")}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRecalculating}
                    onClick={() => handleRecalculate(false)}
                    className="border-border hover:bg-accent text-xs font-semibold cursor-pointer"
                  >
                    {isRecalculating ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    {t("recalculateBtn")} (Giá gốc)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRecalculating}
                    onClick={() => handleRecalculate(true)}
                    className="border-border hover:bg-accent text-xs font-semibold text-[#0F798C] border-[#0F798C]/20 hover:bg-[#0F798C]/5 cursor-pointer"
                  >
                    {isRecalculating ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    {t("recalculateBtn")} (Giá hiện hành)
                  </Button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm mb-6">
                <div className="bg-muted/30 p-4 rounded-xl flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    {t("detailBaseShippingFee")}
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    ${Number(order.baseShippingFee || 0).toFixed(2)}
                  </span>
                </div>
                <div className="bg-muted/30 p-4 rounded-xl flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    {t("detailFuelSurcharge")}
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    ${Number(order.surchargeFee || 0).toFixed(2)}
                  </span>
                </div>
                <div className="bg-[#0F798C]/5 dark:bg-cyan-950/20 p-4 rounded-xl flex flex-col gap-1 border border-[#0F798C]/10">
                  <span className="text-xs text-[#0F798C] dark:text-cyan-400 uppercase font-bold tracking-wider">
                    {t("detailTotalCollected")}
                  </span>
                  <span className="text-xl font-bold text-[#0F798C] dark:text-cyan-400">
                    ${Number(order.totalFee || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Detailed Cost Breakdown Table */}
              <div className="mt-4">
                <h4 className="font-bold text-sm text-muted-foreground mb-3">
                  {t("feeItemsTitle")}
                </h4>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">
                          {t("feeTypeLabel")}
                        </th>
                        <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">
                          {t("feeAmountLabel")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {order.feeItems && order.feeItems.length > 0 ? (
                        order.feeItems.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-foreground">
                              {t(`feeType.${item.feeType}`) || item.name}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                              ${Number(item.amount).toFixed(2)} {item.currency}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <>
                          <tr className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-foreground">
                              {t("detailBaseShippingFee")}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                              ${Number(order.baseShippingFee || 0).toFixed(2)} USD
                            </td>
                          </tr>
                          <tr className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-foreground">
                              {t("detailFuelSurcharge")}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                              ${Number(order.surchargeFee || 0).toFixed(2)} USD
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Admin Status Mutation Panel */}
        <div className="flex flex-col gap-6">
          {/* Customer Info Card */}
          <Card className="rounded-xl border border-border bg-card">
            <CardContent className="p-6 flex flex-col gap-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2 border-b border-border pb-2">
                <User className="h-5 w-5 text-[#0F798C] dark:text-cyan-400" />
                {t("customerInfo")}
              </h3>
              <div className="text-sm font-medium text-foreground flex flex-col gap-2">
                <div className="flex justify-between pb-1.5 border-b border-border/40">
                  <span className="text-muted-foreground font-normal">{t("customerName")}</span>
                  <span>
                    {order.customer?.name || order.customer?.username || `ID: #${order.customerId}`}
                  </span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-border/40">
                  <span className="text-muted-foreground font-normal">{t("customerEmail")}</span>
                  <span className="text-xs break-all">{order.customer?.email}</span>
                </div>
                {order.customer?.phone && (
                  <div className="flex justify-between pb-1.5 border-b border-border/40">
                    <span className="text-muted-foreground font-normal">{t("customerPhone")}</span>
                    <span>{order.customer.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-normal">{t("customerAccount")}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    @{order.customer?.username}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Mutation Form */}
          <Card className="rounded-xl border border-border bg-card">
            <CardContent className="p-6 flex flex-col gap-4">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#0F798C] dark:text-cyan-400" />
                {t("updateStatus")}
              </h3>
              <form onSubmit={handleUpdateStatus} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">
                    {t("selectNewStatus")}
                  </Label>
                  <Select
                    value={newStatus}
                    onValueChange={(val) => setNewStatus(val as OrderStatus)}
                  >
                    <SelectTrigger className="w-full bg-background/50 border-input">
                      <SelectValue placeholder={t("selectStatusPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LABEL_CREATED">{t("status.LABEL_CREATED")}</SelectItem>
                      <SelectItem value="PENDING_LABEL">{t("status.PENDING_LABEL")}</SelectItem>
                      <SelectItem value="PACKAGE_RECEIVED">{t("status.PACKAGE_RECEIVED")}</SelectItem>
                      <SelectItem value="ON_THE_WAY">{t("status.ON_THE_WAY")}</SelectItem>
                      <SelectItem value="PICK_UP">{t("status.PICK_UP")}</SelectItem>
                      <SelectItem value="DELIVERY">{t("status.DELIVERY")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="statusNote" className="text-xs font-bold text-muted-foreground">
                    {t("statusNoteLabel")}
                  </Label>
                  <Input
                    id="statusNote"
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder={t("statusNotePlaceholder")}
                    className="w-full bg-background/50"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isUpdatingStatus || !newStatus}
                  className="w-full bg-[#0F798C] hover:bg-[#0F798C]/90 text-white font-semibold py-2 rounded-lg cursor-pointer"
                >
                  {isUpdatingStatus && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  )}
                  {t("saveChanges")}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Manually Add Scan Timeline Checkpoint Form */}
          <Card className="rounded-xl border border-border bg-card">
            <CardContent className="p-6 flex flex-col gap-4">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-[#0F798C] dark:text-cyan-400" />
                {t("addCheckpointTitle")}
              </h3>
              <form onSubmit={handleAddCheckpoint} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="checkpointDesc"
                    className="text-xs font-bold text-muted-foreground"
                  >
                    {t("checkpointDescLabel")}
                  </Label>
                  <Input
                    id="checkpointDesc"
                    type="text"
                    required
                    value={checkpointDesc}
                    onChange={(e) => setCheckpointDesc(e.target.value)}
                    placeholder={t("checkpointDescPlaceholder")}
                    className="w-full bg-background/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="checkpointLoc"
                    className="text-xs font-bold text-muted-foreground"
                  >
                    {t("checkpointLocLabel")}
                  </Label>
                  <Input
                    id="checkpointLoc"
                    type="text"
                    value={checkpointLoc}
                    onChange={(e) => setCheckpointLoc(e.target.value)}
                    placeholder={t("checkpointLocPlaceholder")}
                    className="w-full bg-background/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="checkpointTime"
                    className="text-xs font-bold text-muted-foreground"
                  >
                    {t("checkpointTimeLabel")}
                  </Label>
                  <Input
                    id="checkpointTime"
                    type="datetime-local"
                    required
                    value={checkpointTime}
                    onChange={(e) => setCheckpointTime(e.target.value)}
                    className="w-full bg-background/50"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isAddingCheckpoint || !checkpointDesc.trim()}
                  className="w-full bg-[#0F798C] hover:bg-[#0F798C]/90 text-white font-semibold py-2 rounded-lg cursor-pointer"
                >
                  {isAddingCheckpoint && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  )}
                  {t("addCheckpointBtn")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Timelines: Checkpoints and Activity Logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {/* Track & Trace Timeline */}
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground mb-4">
              {t("checkpointsTitle")}
            </h3>
            {order.trackingCheckpoints.length === 0 ? (
              <div className="text-sm text-muted-foreground italic py-4">{t("noCheckpoints")}</div>
            ) : (
              <div className="relative border-l border-[#0F798C]/40 ml-2.5 flex flex-col gap-6 py-2">
                {order.trackingCheckpoints.map((cp) => (
                  <div key={cp.id} className="relative pl-6">
                    <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F798C] ring-4 ring-background">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    <div className="flex flex-col text-sm">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(cp.checkpointDate), "dd/MM/yyyy HH:mm")}
                      </span>
                      <span className="font-semibold text-foreground">{cp.description}</span>
                      {cp.location && (
                        <span className="text-xs text-muted-foreground font-medium italic">
                          {t("locationPrefix")}: {cp.location}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Activity Logs */}
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground mb-4">
              {t("activityLogsTitle")}
            </h3>
            <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
              {order.activityLogs.length === 0 ? (
                <div className="text-sm text-muted-foreground italic py-4">
                  {t("noActivityLogs")}
                </div>
              ) : (
                order.activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-muted/40 p-3.5 rounded-xl text-xs flex flex-col gap-1.5"
                  >
                    <div className="flex justify-between text-muted-foreground font-semibold">
                      <span>
                        {t("createdByPrefix")}: {log.actorName} (@{log.actorUsername})
                      </span>
                      <span>{format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss")}</span>
                    </div>
                    <div className="text-foreground font-medium">{log.description}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
