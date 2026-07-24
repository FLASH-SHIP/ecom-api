"use client";

import { trpc } from "@customer/lib/trpc";
import { translate } from "@ecom/i18n";
import { OrderStatus } from "@customer/app/orders/constants/enums";
import { useI18n } from "@ecom/shared/@i18n";
import { getShippingMethodLabel, getShippingOriginLabel } from "@ecom/types";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ecom/ui/components/dialog";
import { ThreeDotsVerticalIcon } from "@ecom/ui/components/icons";
import { PaginationBase } from "@ecom/ui/components/pagination-base";
import { TableBase } from "@ecom/ui/components/table-base";
import { format, subDays } from "date-fns";
import NextLink from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { useState } from "react";
import { OrderFilterBar } from "./components/OrderFilterBar";
import TagOrderStatus from "@customer/app/orders/components/TagOrderStatus";
import { downloadBase64File } from "./utils/export-excel";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: customer orders list and detail modal
export default function CustomerOrdersPage() {
  const { languageId: currentLocale } = useI18n();

  // Filters & Pagination State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [dateFrom, setDateFrom] = useState<string | undefined>(() =>
    format(subDays(new Date(), 6), "yyyy-MM-dd"),
  );
  const [dateTo, setDateTo] = useState<string | undefined>(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [shippingMethodFilter, setShippingMethodFilter] = useState<string>("");

  // Selected Order Detail Modal
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);

  // Fetch orders list
  const { data: listData, isLoading } = trpc.customer.orders.list.useQuery({
    search: search.trim() || undefined,
    status: statusFilter && statusFilter !== "ALL" ? (statusFilter as OrderStatus) : undefined,
    fromDate: dateFrom,
    toDate: dateTo,
    shippingMethod:
      shippingMethodFilter && shippingMethodFilter !== "ALL"
        ? (shippingMethodFilter as "EPACKET" | "EXPRESS")
        : undefined,
    page,
    perPage,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Export Excel Backend Mutation
  const exportExcelMutation = trpc.customer.orders.exportExcel.useMutation({
    onSuccess: (res) => {
      if (res?.fileData && res?.filename) {
        downloadBase64File(res.filename, res.fileData);
      }
    },
  });

  const handleExport = () => {
    exportExcelMutation.mutate({
      search: search.trim() || undefined,
      status: statusFilter && statusFilter !== "ALL" ? (statusFilter as OrderStatus) : undefined,
      fromDate: dateFrom,
      toDate: dateTo,
      shippingMethod:
        shippingMethodFilter && shippingMethodFilter !== "ALL"
          ? (shippingMethodFilter as "EPACKET" | "EXPRESS")
          : undefined,
      page,
      perPage,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  // Fetch selected order detail securely
  const { data: orderDetails, isLoading: isLoadingDetails } = trpc.customer.orders.get.useQuery(
    { id: selectedOrderId || "" },
    { enabled: !!selectedOrderId },
  );

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "LABEL_CREATED":
        return (
          <Badge variant="default" className="bg-[#0F798C] text-white">
            Label Created
          </Badge>
        );
      case "PENDING_LABEL":
        return <Badge variant="warning">Pending Label</Badge>;
      case "PACKAGE_RECEIVED":
        return <Badge variant="secondary">Package Received</Badge>;
      case "ON_THE_WAY":
        return (
          <Badge variant="default" className="bg-[#0F798C] text-white">
            On the Way
          </Badge>
        );
      case "PICK_UP":
        return (
          <Badge variant="default" className="bg-blue-500 text-white">
            Pick Up
          </Badge>
        );
      case "DELIVERY":
        return <Badge variant="success">Delivery</Badge>;
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
      header: translate("customerOrder.table.time", currentLocale),
      width: 120,
      sortable: true,
      sortKey: "createdAt",
      cell: (order: OrderType) => (
        <div className={"flex flex-col"}>
          <span>{format(new Date(order.createdAt), "dd/MM/yyyy")}</span>
          <span className={"text-[#7B7B7B]"}>{format(new Date(order.createdAt), "HH:mm")}</span>
        </div>
      ),
    },
    {
      header: translate("customerOrder.table.reception", currentLocale),
      width: 320,
      sortable: true,
      sortKey: "receiverName",
      cell: (order: OrderType) => (
        <div className={"flex flex-col"}>
          <span>{order?.receiverName}</span>
          <span className={"text-[#7B7B7B]"}>{order?.receiverPhone}</span>
          <span className={"text-[#7B7B7B]"}>
            {order?.receiverAddress1 +
              ", " +
              order?.receiverCity +
              ", " +
              order?.receiverState +
              ", " +
              order?.receiverZipCode +
              ", " +
              order?.receiverCountry}
          </span>
        </div>
      ),
    },
    {
      header: translate("customerOrder.placeholder.status", currentLocale),
      width: 135,
      cell: (order: OrderType) => <TagOrderStatus status={order.status} />,
    },
    {
      header: translate("customerOrder.table.orderId", currentLocale),
      width: 180,
      sortable: true,
      sortKey: "orderCode",
      cell: (order: OrderType) => (
        <span className="font-medium text-[#0F798C] hover:underline cursor-pointer">
          <NextLink href={`/orders/${order.id}`}>{order.orderCode}</NextLink>
        </span>
      ),
    },
    {
      header: translate("customerOrder.table.fee", currentLocale),
      width: 100,
      sortable: true,
      sortKey: "baseShippingFee",
      cell: (order: OrderType) => (
        <span className="font-medium text-foreground">
          $
          {order.baseShippingFee
            ? (Number(order.baseShippingFee) + Number(order.surchargeFee || 0)).toFixed(2)
            : "0.00"}
        </span>
      ),
    },
    {
      header: translate("customerOrder.placeholder.shippingMethod", currentLocale),
      width: 160,
      cell: (order: OrderType) => <span className={'font-medium text-foreground'}>{getShippingMethodLabel(order?.shippingMethod)}</span>,
    },
    {
      header: translate("customerOrder.table.trackingNumber", currentLocale),
      width: 180,
      sortable: true,
      sortKey: "trackingNumber",
      cell: (order: OrderType) => <span className={'font-medium text-foreground'}>{order?.trackingNumber}</span>,
    },
    {
      header: translate("customerOrder.table.action", currentLocale),
      width: 80,
      fixed: "right" as const,
      headerClassName: "text-center",
      className: "text-center",
      cell: (order: OrderType) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-accent text-primary h-8 w-8 rounded-lg cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:ring-0 data-[state=open]:outline-none"
                title="Actions"
              >
                <ThreeDotsVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 bg-white dark:bg-zinc-900 border border-border shadow-md rounded-lg p-1 z-30">
              {order?.status === OrderStatus.PENDING_LABEL && (
                <DropdownMenuItem
                  disabled={true}
                  className="px-3 py-2 text-sm text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle Get Label action
                  }}
                >
                  {translate("customerOrder.getLabels", currentLocale)}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                disabled={true}
                className="px-3 py-2 text-sm text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {translate("customerOrder.edit", currentLocale)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full pb-10">
      <div className="flex justify-between items-center">
        <h1 className="title-page-content text-2xl font-bold text-foreground">
          {translate("customerOrder.orderList", currentLocale)}
        </h1>
      </div>

      {/* Filters Section */}
      <OrderFilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateChange={(from, to) => {
          setDateFrom(from);
          setDateTo(to);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        shippingMethodFilter={shippingMethodFilter}
        onShippingMethodFilterChange={(val) => {
          setShippingMethodFilter(val);
          setPage(1);
        }}
        selectedCount={selectedRowIds.length}
        onClearAll={() => {
          const today = new Date();
          setSearch("");
          setStatusFilter("");
          setShippingMethodFilter("");
          setDateFrom(format(subDays(today, 6), "yyyy-MM-dd"));
          setDateTo(format(today, "yyyy-MM-dd"));
          setPage(1);
        }}
        isExporting={exportExcelMutation.isPending}
        onExport={handleExport}
      />

      {/* Orders Table */}
      <Card className="rounded-xl border border-border bg-card overflow-hidden">
        <TableBase
          data={listData?.data || []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={translate("customerOrder.table.noOrdersFound", currentLocale)}
          enableRowSelection={true}
          selectedRowIds={selectedRowIds}
          onSelectedRowIdsChange={setSelectedRowIds}
          minWidth={1200}
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
            renderRangeText={(from, to, total) => (
              <>
                {translate("pagination.showing", currentLocale)} {from}-{to}{" "}
                {translate("pagination.of", currentLocale)}{" "}
                <span className="text-[#4277DB] font-semibold">{total}</span>{" "}
                {translate("pagination.orders", currentLocale)}
              </>
            )}
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
                        {getShippingMethodLabel(orderDetails.shippingMethod)}
                      </div>

                      <div className="text-muted-foreground">Shipping Origin</div>
                      <div className="font-medium text-foreground">
                        {getShippingOriginLabel(orderDetails.shippingOrigin)}
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
