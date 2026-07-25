"use client";

import { trpc } from "@customer/lib/trpc";
import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import { format } from "date-fns";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BasicInfoSummaryCard } from "../components/BasicInfoSummaryCard";
import { ChargesSummaryCard } from "../components/ChargesSummaryCard";
import { PackageSummaryCard } from "../components/PackageSummaryCard";
import { RecipientSummaryCard } from "../components/RecipientSummaryCard";
import { SenderSummaryCard } from "../components/SenderSummaryCard";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: dynamic rendering cards for order details
export default function CustomerOrderDetailPage() {
  const { languageId: currentLocale } = useI18n();
  const params = useParams();
  const id = params?.id as string;

  // Fetch details
  const {
    data: order,
    isLoading,
    refetch,
  } = trpc.customer.orders.get.useQuery({ id }, { enabled: !!id });

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col justify-center items-center gap-2">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F798C] border-t-transparent" />
        <span className="text-sm text-muted-foreground">
          {translate("customerOrder.detail.loadingDetails", currentLocale)}
        </span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-12 text-center flex flex-col gap-4 items-center">
        <h2 className="text-xl font-bold">
          {translate("customerOrder.detail.notFound", currentLocale)}
        </h2>
        <p className="text-muted-foreground">
          {translate("customerOrder.detail.notFoundDesc", currentLocale)}
        </p>
        <Link href="/orders">
          <Button className="bg-[#0F798C] text-white">
            {translate("customerOrder.detail.backToList", currentLocale)}
          </Button>
        </Link>
      </div>
    );
  }

  const baseFee = Number(order.baseShippingFee || 0);
  const surcharge = Number(order.surchargeFee || 0);
  const total = baseFee + surcharge;
  const chargeableKg = Number(order.chargeableWeight ? Number(order.chargeableWeight) / 1000 : 2.5);

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {translate("customerOrder.detail.title", currentLocale)} - {order.orderCode}
        </h1>
      </div>

      {/* Main 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & Column 2: Recipient, Sender, Basic Infor, Package */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <RecipientSummaryCard
            data={{
              receiverName: order.receiverName,
              cityStateCountry: [order.receiverCity, order.receiverState, order.receiverCountry]
                .filter(Boolean)
                .join(", "),
              receiverAddress1: order.receiverAddress1,
              receiverAddress2: order.receiverAddress2,
              receiverZipCode: order.receiverZipCode,
              receiverPhone: order.receiverPhone,
              receiverEmail: order.receiverEmail,
            }}
          />
          <SenderSummaryCard
            data={{
              senderName: order.senderName,
              cityStateCountry: [order.senderCity, order.senderState || order.senderCountry]
                .filter(Boolean)
                .join(", "),
              senderAddress: order.senderAddress,
              senderZipCode: order.senderZipCode,
              senderPhone: order.senderPhone,
              senderEmail: order.senderEmail,
            }}
          />
          <BasicInfoSummaryCard
            data={{
              shippingOrigin: order.shippingOrigin,
              orderId: order.orderCode,
              shippingMethod: order.shippingMethod === "EXPRESS" ? "Express" : "ePacket",
              detailDescription: order.detailDescription,
              createdTime: format(new Date(order.createdAt), "dd/MM/yyyy HH:mm"),
            }}
          />
          <PackageSummaryCard
            data={{
              value: Number(order.declaredValue || 0).toFixed(2),
              dimensions:
                order.dimensionLength && order.dimensionWidth && order.dimensionHeight
                  ? `L ${order.dimensionLength} × W ${order.dimensionWidth} × H ${order.dimensionHeight} cm`
                  : "N/A",
              weight: order.declaredWeight?.toString() || "0",
              volumeWeight: order.volumeWeight?.toString() || "0",
              hsCode: `${order.receiverCountry || "US"} - ${order.products?.[0]?.hsCode || "7326.90.86"}`,
            }}
          />
        </div>

        {/* Column 3: Charges & Surcharges + Checkpoints + Activity Logs */}
        <div className="flex flex-col gap-6">
          <ChargesSummaryCard
            data={{
              baseShippingRate: baseFee,
              fuelSurcharge: surcharge,
              chargeableWeightKg: chargeableKg,
              totalAmount: total,
            }}
          />

          {/* Tracking Checkpoints */}
          {order.trackingCheckpoints && order.trackingCheckpoints.length > 0 && (
            <Card className="rounded-xl border border-border bg-card shadow-sm">
              <CardContent className="p-6 flex flex-col gap-4">
                <h3 className="font-bold text-base border-b border-border pb-3 text-foreground">
                  {translate("customerOrder.detail.trackingCheckpoints", currentLocale)}
                </h3>
                <div className="relative border-l border-[#0F798C]/40 ml-2.5 flex flex-col gap-6 py-2">
                  {order.trackingCheckpoints?.map((cp) => (
                    <div key={cp.id} className="relative pl-6">
                      <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F798C] ring-4 ring-background">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(cp.checkpointDate), "dd/MM/yyyy HH:mm")}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {cp.description}
                        </span>
                        {cp.location && (
                          <span className="text-xs text-muted-foreground font-medium italic">
                            {translate("customerOrder.detail.location", currentLocale)}:{" "}
                            {cp.location}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
