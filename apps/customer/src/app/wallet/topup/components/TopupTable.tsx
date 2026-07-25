"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@ecom/ui/components/dropdown-menu";
import {ThreeDotsVerticalIcon} from "@ecom/ui/components/icons";
import {TableBase} from "@customer/components/ui/table-base";
import {PaginationBase} from "@customer/components/ui/pagination-base";


export interface TopupItem {
  id: string;
  orderCode: string;
  submissionDate: string;
  wireDate: string;
  paymentMethod: string;
  wireTransferConfirmation: string;
  status: "WAITING" | "CONFIRM" | "REJECT";
  wireAmount: string;
  wireAmountApproved: string;
}

const MOCK_TOPUP_DATA = {
  data: [
    {
      id: "1",
      orderCode: "TOP-2026072501",
      submissionDate: "25/07/2026 15:30",
      wireDate: "25/07/2026",
      paymentMethod: "Bank Transfer",
      wireTransferConfirmation: "CONF-9812405",
      status: "WAITING" as const,
      wireAmount: "$261,000,077.00",
      wireAmountApproved: "$0.00",
    },
    {
      id: "2",
      orderCode: "TOP-2026072002",
      submissionDate: "20/07/2026 10:15",
      wireDate: "20/07/2026",
      paymentMethod: "Credit Card",
      wireTransferConfirmation: "CONF-7712390",
      status: "CONFIRM" as const,
      wireAmount: "$50,000.00",
      wireAmountApproved: "$50,000.00",
    },
    {
      id: "3",
      orderCode: "TOP-2026071203",
      submissionDate: "12/07/2026 14:22",
      wireDate: "12/07/2026",
      paymentMethod: "Bank Transfer",
      wireTransferConfirmation: "CONF-6512891",
      status: "CONFIRM" as const,
      wireAmount: "$100,000.00",
      wireAmountApproved: "$100,000.00",
    },
    {
      id: "4",
      orderCode: "TOP-2026070504",
      submissionDate: "05/07/2026 09:10",
      wireDate: "05/07/2026",
      paymentMethod: "Paypal",
      wireTransferConfirmation: "CONF-4412092",
      status: "REJECT" as const,
      wireAmount: "$15,000.00",
      wireAmountApproved: "$0.00",
    },
  ],
  meta: {
    total: 4,
    page: 1,
    perPage: 10,
  },
};

export default function TopupTable() {
  const { languageId: currentLocale } = useI18n();
  const isLoading = false;

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const listData = MOCK_TOPUP_DATA;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  type OrderType = (typeof MOCK_TOPUP_DATA)["data"][number];

  const columns = [
    {
      header:
        translate("customerWallet.table.no", currentLocale) ||
        "No.",
      width: 50,
      fixed: "left" as const,
      headerClassName: "text-center",
      className: "text-center font-medium text-muted-foreground",
      cell: (order: OrderType) => {
        const index = listData.data.findIndex((item) => item.id === order.id);
        const rowNumber = (page - 1) * perPage + index + 1;
        return <div>{rowNumber}</div>;
      },
    },
    {
      header:
        translate("customerWallet.table.submissionId", currentLocale) ||
        "Submission ID",
      width: 140,
      cell: (order: OrderType) => (
        <span className="font-semibold text-[#0F798C]">{order.orderCode}</span>
      ),
    },
    {
      header:
        translate("customerWallet.table.submissionDate", currentLocale) ||
        "Submission Date",
      width: 170,
      cell: (order: OrderType) => <div>{order.submissionDate}</div>,
    },
    {
      header:
        translate("customerWallet.table.wireDate", currentLocale) ||
        "Wire Date",
      width: 135,
      cell: (order: OrderType) => <div>{order.wireDate}</div>,
    },
    {
      header:
        translate("customerWallet.table.paymentMethod", currentLocale) ||
        "Payment Method",
      width: 160,
      cell: (order: OrderType) => <div>{order.paymentMethod}</div>,
    },
    {
      header:
        translate("customerWallet.table.confirmation", currentLocale) ||
        "Confirmation No.",
      width: 160,
      cell: (order: OrderType) => <div>{order.wireTransferConfirmation}</div>,
    },
    {
      header:
        translate("customerWallet.table.status", currentLocale) || "Status",
      width: 135,
      cell: (order: OrderType) => {
        if (order.status === "CONFIRM") {
          return (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-200 font-medium">
              {translate("customerWallet.status.confirm", currentLocale) ||
                "Confirmed"}
            </Badge>
          );
        }
        if (order.status === "WAITING") {
          return (
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-200 font-medium">
              {translate("customerWallet.status.waiting", currentLocale) ||
                "Waiting"}
            </Badge>
          );
        }
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border-rose-200 font-medium">
            {translate("customerWallet.status.reject", currentLocale) ||
              "Rejected"}
          </Badge>
        );
      },
    },
    {
      header:
        translate("customerWallet.table.wireAmount", currentLocale) ||
        "Wire Amount",
      width: 160,
      cell: (order: OrderType) => (
        <span className="font-bold text-foreground">{order.wireAmount}</span>
      ),
    },
    {
      header:
        translate("customerWallet.table.approvedAmount", currentLocale) ||
        "Approved Amount",
      width: 160,
      cell: (order: OrderType) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {order.wireAmountApproved}
        </span>
      ),
    },
    {
      header:
        translate("customerWallet.table.action", currentLocale),
      width: 80,
      fixed: "right" as const,
      headerClassName: "text-center",
      className: "text-center",
      cell: (order: OrderType) => (
        // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: wrapper div to stop row click propagation
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
            <DropdownMenuContent
              align="end"
              className="w-36 bg-white dark:bg-zinc-900 border border-border shadow-md rounded-lg p-1 z-30"
            >
              <DropdownMenuItem
                disabled={true}
                className="px-3 py-2 text-sm text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle Get Label action
                }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={true}
                className="px-3 py-2 text-sm text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                Cancel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <Card className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <TableBase
        data={listData.data}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={
          translate("customerWallet.table.noRecordsFound", currentLocale) ||
          "No top-up records found."
        }
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
              <span className="text-[#0F798C] font-semibold">{total}</span>{" "}
              {translate("pagination.orders", currentLocale)}
            </>
          )}
        />
      )}
    </Card>
  );
}
