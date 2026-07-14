"use client";

import { trpc } from "@customer/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import { format } from "date-fns";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: dynamic rendering cards for order details
export default function CustomerOrderDetailPage() {
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
        <span className="text-sm text-muted-foreground">Loading details...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-12 text-center flex flex-col gap-4 items-center">
        <h2 className="text-xl font-bold">Order Not Found</h2>
        <p className="text-muted-foreground">
          The requested order does not exist or you do not have permission to view it.
        </p>
        <Link href="/orders">
          <Button className="bg-[#0F798C] text-white">Back to List</Button>
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
          <h1 className="text-2xl font-bold text-foreground">Order Detail - {order.orderCode}</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recipient Details */}
            <Card className="rounded-xl border border-border bg-card">
              <CardContent className="p-6 flex flex-col gap-4">
                <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground">
                  Recipient
                </h3>
                <div className="grid grid-cols-3 gap-y-3 text-sm">
                  <div className="text-muted-foreground">Recipient Name</div>
                  <div className="col-span-2 font-medium text-foreground">{order.receiverName}</div>

                  <div className="text-muted-foreground">City/State/Country</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.receiverCity}, {order.receiverState}, {order.receiverCountry}
                  </div>

                  <div className="text-muted-foreground">Address 1</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.receiverAddress1}
                  </div>

                  {order.receiverAddress2 && (
                    <>
                      <div className="text-muted-foreground">Address 2</div>
                      <div className="col-span-2 font-medium text-foreground">
                        {order.receiverAddress2}
                      </div>
                    </>
                  )}

                  <div className="text-muted-foreground">Zip/Post code</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.receiverZipCode}
                  </div>

                  <div className="text-muted-foreground">Phone Number</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.receiverPhone || "N/A"}
                  </div>

                  <div className="text-muted-foreground">Email</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.receiverEmail || "N/A"}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sender Details */}
            <Card className="rounded-xl border border-border bg-card">
              <CardContent className="p-6 flex flex-col gap-4">
                <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground">
                  Sender
                </h3>
                <div className="grid grid-cols-3 gap-y-3 text-sm">
                  <div className="text-muted-foreground">Sender Name</div>
                  <div className="col-span-2 font-medium text-foreground">{order.senderName}</div>

                  <div className="text-muted-foreground">City/Country</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.senderCity}, {order.senderCountry}
                  </div>

                  <div className="text-muted-foreground">Address</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.senderAddress}
                  </div>

                  <div className="text-muted-foreground">Zip/Post code</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.senderZipCode}
                  </div>

                  <div className="text-muted-foreground">Phone Number</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.senderPhone || "N/A"}
                  </div>

                  <div className="text-muted-foreground">Email</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.senderEmail || "N/A"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info Details */}
            <Card className="rounded-xl border border-border bg-card">
              <CardContent className="p-6 flex flex-col gap-4">
                <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground">
                  Basic Info
                </h3>
                <div className="grid grid-cols-3 gap-y-3 text-sm">
                  <div className="text-muted-foreground">Shipping Origin</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.shippingOrigin}
                  </div>

                  <div className="text-muted-foreground">Order Code</div>
                  <div className="col-span-2 font-medium text-cyan-600 dark:text-cyan-400 font-semibold hover:underline">
                    <Link href={`/orders/${order.id}`}>{order.orderCode}</Link>
                  </div>

                  <div className="text-muted-foreground">Shipping Method</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.shippingMethod === "EXPRESS" ? "Express" : "ePacket"}
                  </div>

                  <div className="text-muted-foreground">Order ID</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.sellerOrderId || "N/A"}
                  </div>

                  <div className="text-muted-foreground">Details Description</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {order.detailDescription}
                  </div>

                  <div className="text-muted-foreground">Created Time</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {new Date(order.createdAt).toLocaleDateString("vi-VN")}{" "}
                    {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Package Details */}
            <Card className="rounded-xl border border-border bg-card">
              <CardContent className="p-6 flex flex-col gap-4">
                <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground">
                  Package
                </h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-muted-foreground">Value</div>
                  <div className="font-medium text-foreground">
                    ${Number(order.declaredValue || 0).toFixed(2)}
                  </div>

                  <div className="text-muted-foreground">Dimensions</div>
                  <div className="font-medium text-foreground">
                    {order.dimensionLength && order.dimensionWidth && order.dimensionHeight
                      ? `L ${order.dimensionLength} × W ${order.dimensionWidth} × H ${order.dimensionHeight} cm`
                      : "N/A"}
                  </div>

                  <div className="text-muted-foreground">Weight</div>
                  <div className="font-medium text-foreground">
                    {order.declaredWeight?.toString()} gr
                  </div>

                  <div className="text-muted-foreground">Volume Weight</div>
                  <div className="font-medium text-foreground">
                    {order.volumeWeight?.toString() || "0"} gr
                  </div>

                  <div className="text-muted-foreground">HS Code (Primary)</div>
                  <div className="font-medium text-foreground">
                    {order.products?.[0]?.hsCode || "N/A"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products Details */}
          {order.products && order.products.length > 0 && (
            <Card className="rounded-xl border border-border bg-card">
              <CardContent className="p-6 flex flex-col gap-4">
                <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground">
                  Products ({order.products.length})
                </h3>
                <div className="flex flex-col gap-4">
                  {order.products.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-start text-sm border-b border-dashed border-border last:border-0 pb-3 last:pb-0"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">{p.description}</span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {p.hsCode && <span>HS Code: {p.hsCode}</span>}
                          {p.originCountry && <span>Origin: {p.originCountry}</span>}
                          {p.weight && <span>| Weight: {p.weight} gr</span>}
                          {p.sku && <span>| SKU: {p.sku}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-foreground">
                          ${Number(p.value || 0).toFixed(2)} × {p.quantity}
                        </div>
                        <div className="text-xs text-muted-foreground font-semibold">
                          Total: ${(Number(p.value || 0) * Number(p.quantity || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charges & Surcharges Card */}
        <div className="flex flex-col gap-6">
          <Card className="rounded-xl border border-[#cbeef2] bg-[#E5F7F9] dark:bg-cyan-950/20 dark:border-cyan-900/30 shadow-sm">
            <CardContent className="p-6 flex flex-col gap-6">
              <h3 className="font-bold text-lg text-[#0F798C] dark:text-cyan-400">
                Charges & Surcharges
              </h3>
              <div className="flex flex-col gap-3 text-sm text-[#0F798C] dark:text-cyan-300">
                <div className="flex justify-between">
                  <span className="text-[#0F798C]/70 dark:text-cyan-400/70">
                    Base Shipping Rate
                  </span>
                  <span className="font-semibold text-foreground">
                    ${Number(order.baseShippingFee || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#0F798C]/70 dark:text-cyan-400/70">Fuel Surcharge</span>
                  <span className="font-semibold text-foreground">
                    ${Number(order.surchargeFee || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#0F798C]/70 dark:text-cyan-400/70">Chargeable Weight</span>
                  <span className="font-semibold text-foreground">
                    {(Number(order.chargeableWeight || 0) / 1000).toFixed(2)} kg
                  </span>
                </div>
                <div className="border-t border-dashed border-[#a6e2eb] pt-3 flex justify-between text-base font-bold">
                  <span className="text-[#0F798C]">TOTAL AMOUNT</span>
                  <span className="text-[#0F798C] text-lg dark:text-cyan-400">
                    $
                    {(Number(order.baseShippingFee || 0) + Number(order.surchargeFee || 0)).toFixed(
                      2,
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Track & Trace Checkpoints */}
          <Card className="rounded-xl border border-border bg-card">
            <CardContent className="p-6 flex flex-col gap-4">
              <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground">
                Track & Trace Checkpoints
              </h3>
              {order.trackingCheckpoints && order.trackingCheckpoints.length === 0 ? (
                <div className="text-sm text-muted-foreground italic py-2">
                  No tracking scan history found. Labels are generated, waiting for first scan at
                  our hub.
                </div>
              ) : (
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
                            Location: {cp.location}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Logs */}
          <Card className="rounded-xl border border-border bg-card">
            <CardContent className="p-6 flex flex-col gap-4">
              <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground">
                Activity Logs
              </h3>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {order.activityLogs && order.activityLogs.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic py-2">
                    No activity logs found.
                  </div>
                ) : (
                  order.activityLogs?.map((log) => (
                    <div
                      key={log.id}
                      className="bg-muted/40 p-2.5 rounded-lg text-xs flex flex-col gap-1"
                    >
                      <div className="flex justify-between text-muted-foreground">
                        <span className="font-semibold">
                          {log.actorName}{" "}
                          {log.actorType === "CUSTOMER" ? "" : `(${log.actorType.toLowerCase()})`}
                        </span>
                        <span>{format(new Date(log.createdAt), "dd/MM/yyyy HH:mm")}</span>
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
    </div>
  );
}
