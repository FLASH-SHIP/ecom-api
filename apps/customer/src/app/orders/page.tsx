"use client";

import { trpc } from "@customer/lib/trpc";
import { translate } from "@ecom/i18n";
import type { OrderStatus } from "@ecom/prisma";
import { useI18n } from "@ecom/shared/@i18n";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ecom/ui/components/dialog";
import { Input } from "@ecom/ui/components/input";
import { PaginationBase } from "@ecom/ui/components/pagination-base";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { TableBase } from "@ecom/ui/components/table-base";
import { format } from "date-fns";
import { Eye, RefreshCcw, Search } from "lucide-react";
import NextLink from "next/link";
import { useState } from "react";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: customer orders list and detail modal
export default function CustomerOrdersPage() {
  const { languageId: currentLocale } = useI18n();

  // Filters & Pagination State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Selected Order Detail Modal
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);

  // Fetch orders list
  const {
    data: listData,
    isLoading,
    refetch,
  } = trpc.customer.orders.list.useQuery({
    search: search.trim() || undefined,
    status: statusFilter !== "ALL" ? (statusFilter as OrderStatus) : undefined,
    page,
    perPage,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Fetch selected order detail securely
  const { data: orderDetails, isLoading: isLoadingDetails } = trpc.customer.orders.get.useQuery(
    { id: selectedOrderId || "" },
    { enabled: !!selectedOrderId },
  );

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary">Draft</Badge>;
      case "LABEL_NOT_CREATED":
        return <Badge variant="warning">Label Not Created</Badge>;
      case "WAITING_FOR_PICKUP":
        return (
          <Badge variant="default" className="bg-[#0F798C] text-white">
            Label Created
          </Badge>
        );
      case "PICKED_UP":
        return (
          <Badge variant="default" className="bg-blue-500 text-white">
            Picked Up
          </Badge>
        );
      case "DELIVERED":
        return <Badge variant="success">Delivered</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "EXCEPTION":
        return <Badge variant="destructive">Exception</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  type OrderType = NonNullable<typeof listData>["data"][number];
  const columns = [
    {
      header: "Order Code",
      cell: (order: OrderType) => (
        <span className="font-semibold text-[#0F798C] hover:underline cursor-pointer">
          <NextLink href={`/orders/${order.id}`}>{order.orderCode}</NextLink>
        </span>
      ),
    },
    {
      header: "Created Date",
      cell: (order: OrderType) => (
        <span className="text-muted-foreground">
          {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}
        </span>
      ),
    },
    {
      header: "Seller Ref",
      cell: (order: OrderType) => order.sellerOrderId || "-",
    },
    {
      header: "Destination",
      cell: (order: OrderType) => `${order.receiverCity}, ${order.receiverCountry}`,
    },
    {
      header: "Weight (gr)",
      cell: (order: OrderType) => order.declaredWeight,
    },
    {
      header: "Total Fee",
      cell: (order: OrderType) => (
        <span className="font-semibold text-foreground">
          $
          {order.baseShippingFee
            ? (Number(order.baseShippingFee) + Number(order.surchargeFee || 0)).toFixed(2)
            : "0.00"}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (order: OrderType) => getStatusBadge(order.status),
    },
    {
      header: "Action",
      headerClassName: "text-right",
      className: "text-right",
      cell: (order: OrderType) => (
        <NextLink href={`/orders/${order.id}`}>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent text-primary h-8 w-8 rounded-lg cursor-pointer"
            title="View tracking and details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </NextLink>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="flex justify-between items-center">
        <h1 className="title-page-content text-2xl font-bold text-foreground">
          {translate("orders.orderList", currentLocale)}
        </h1>
        <NextLink href="/orders/single">
          <Button className="bg-[#0F798C] hover:bg-[#0F798C]/90 text-white font-semibold">
            + {translate("orders.createSingleOrder", currentLocale)}
          </Button>
        </NextLink>
      </div>

      {/* Filters Card */}
      <Card className="rounded-xl border border-border bg-card">
        <CardContent className="p-4 md:p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order code, recipient name, or id..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 bg-background/50"
            />
          </div>

          <div className="flex w-full md:w-auto items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-48 bg-background/50 border-input">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="LABEL_NOT_CREATED">Label Not Created</SelectItem>
                <SelectItem value="WAITING_FOR_PICKUP">Label Created</SelectItem>
                <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="EXCEPTION">Exception</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className="border-border hover:bg-accent cursor-pointer"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="rounded-xl border border-border bg-card overflow-hidden">
        <TableBase
          data={listData?.data || []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No orders found. Create your first single order above!"
          enableRowSelection={true}
          selectedRowIds={selectedRowIds}
          onSelectedRowIdsChange={setSelectedRowIds}
        />

        {/* Pagination Controls */}
        {listData && listData.meta.total > 0 && (
          <PaginationBase
            currentPage={page}
            totalItems={listData.meta.total}
            perPage={perPage}
            onPageChange={handlePageChange}
            onPerPageChange={(val) => {
              setPerPage(val);
              setPage(1);
            }}
            itemType="orders"
          />
        )}
      </Card>

      {/* Order Detail & Tracking Dialog */}
      <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="max-w-3xl w-[95%] rounded-3xl p-6 md:p-8 max-h-[85vh] overflow-y-auto">
          {isLoadingDetails || !orderDetails ? (
            <div className="py-12 flex justify-center items-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F798C] border-t-transparent" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Order Details: {orderDetails.orderCode}
                </DialogTitle>
                <DialogDescription>
                  Detailed tracking history, scan checkpoints, and order information.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Details Section */}
                <div className="flex flex-col gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                      Shipping Information
                    </h4>
                    <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                      <div className="text-muted-foreground">Shipping Method</div>
                      <div className="font-medium text-foreground">
                        {orderDetails.shippingMethod}
                      </div>

                      <div className="text-muted-foreground">Shipping Origin</div>
                      <div className="font-medium text-foreground">
                        {orderDetails.shippingOrigin}
                      </div>

                      <div className="text-muted-foreground">Status</div>
                      <div>{getStatusBadge(orderDetails.status)}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                      Recipient Address
                    </h4>
                    <div className="text-sm font-medium text-foreground flex flex-col gap-0.5">
                      <div>{orderDetails.receiverName}</div>
                      <div className="text-muted-foreground">{orderDetails.receiverPhone}</div>
                      <div>{orderDetails.receiverAddress1}</div>
                      {orderDetails.receiverAddress2 && (
                        <div className="text-muted-foreground">{orderDetails.receiverAddress2}</div>
                      )}
                      <div>
                        {orderDetails.receiverCity}, {orderDetails.receiverState},{" "}
                        {orderDetails.receiverCountry} ({orderDetails.receiverZipCode})
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                      Weight & Dim
                    </h4>
                    <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                      <div className="text-muted-foreground">Declared Weight</div>
                      <div className="font-medium text-foreground">
                        {orderDetails.declaredWeight?.toString()} gr
                      </div>

                      <div className="text-muted-foreground">Volume Weight</div>
                      <div className="font-medium text-foreground">
                        {orderDetails.volumeWeight?.toString() || "0"} gr
                      </div>

                      <div className="text-muted-foreground">Base Charge</div>
                      <div className="font-medium text-foreground">
                        ${Number(orderDetails.baseShippingFee || 0).toFixed(2)}
                      </div>

                      <div className="text-muted-foreground">Fuel Surcharge</div>
                      <div className="font-medium text-foreground">
                        ${Number(orderDetails.surchargeFee || 0).toFixed(2)}
                      </div>

                      <div className="border-t border-border pt-1 text-muted-foreground font-bold">
                        Total
                      </div>
                      <div className="border-t border-border pt-1 font-bold text-[#0F798C] dark:text-cyan-400">
                        $
                        {(
                          Number(orderDetails.baseShippingFee || 0) +
                          Number(orderDetails.surchargeFee || 0)
                        ).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Track & Trace Timeline Section */}
                <div className="border-l border-border pl-0 md:pl-6 flex flex-col gap-4">
                  <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">
                    Track & Trace Checkpoints
                  </h4>

                  {orderDetails.trackingCheckpoints &&
                  orderDetails.trackingCheckpoints.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 italic">
                      No tracking scan history found. Labels are generated, waiting for first scan
                      at our hub.
                    </div>
                  ) : (
                    <div className="relative border-l border-[#0F798C]/40 ml-2.5 flex flex-col gap-6 py-2">
                      {orderDetails.trackingCheckpoints?.map((cp) => (
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

                  {/* Activity Audit Logs */}
                  <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mt-4">
                    Activity Logs
                  </h4>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                    {orderDetails.activityLogs?.map((log) => (
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
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
