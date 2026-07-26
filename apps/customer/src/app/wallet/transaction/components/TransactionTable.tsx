"use client";

import { PaginationBase } from "@customer/components/ui/pagination-base";
import { TableBase } from "@customer/components/ui/table-base";
import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Badge } from "@ecom/ui/components/badge";
import { Card } from "@ecom/ui/components/card";
import { useState } from "react";

export interface TransactionItem {
  id: string;
  date: string;
  orderCode: string;
  partnerOrderId: string;
  transactionType:
    | "PAID"
    | "ADDED_FUNDS"
    | "CANCELED"
    | "REFUNDED"
    | "ADJUST_INCREASE"
    | "ADJUST_DECREASE";
  initialAmount: string;
  amount: string;
  finalAmount: string;
  description: string;
}

const MOCK_TRANSACTION_DATA = {
  data: [
    {
      id: "1",
      date: "25/07/2026 14:30:12",
      orderCode: "ORD-20260725-8812",
      partnerOrderId: "PO-991823",
      transactionType: "PAID" as const,
      initialAmount: "$100,000.00",
      amount: "-$368.00",
      finalAmount: "$99,632.00",
      description: "Payment for Order #ORD-20260725-8812",
    },
    {
      id: "2",
      date: "24/07/2026 11:15:00",
      orderCode: "TOP-20260724-001",
      partnerOrderId: "-",
      transactionType: "ADDED_FUNDS" as const,
      initialAmount: "$49,632.00",
      amount: "+$50,000.00",
      finalAmount: "$99,632.00",
      description: "Bank transfer top-up via CONF-9812405",
    },
    {
      id: "3",
      date: "22/07/2026 09:45:30",
      orderCode: "ORD-20260722-1054",
      partnerOrderId: "PO-887123",
      transactionType: "REFUNDED" as const,
      initialAmount: "$49,500.00",
      amount: "+$132.00",
      finalAmount: "$49,632.00",
      description: "Refund for canceled order #ORD-20260722-1054",
    },
    {
      id: "4",
      date: "20/07/2026 16:20:10",
      orderCode: "ORD-20260720-0098",
      partnerOrderId: "PO-772109",
      transactionType: "CANCELED" as const,
      initialAmount: "$49,500.00",
      amount: "$0.00",
      finalAmount: "$49,500.00",
      description: "Order canceled prior to processing",
    },
    {
      id: "5",
      date: "18/07/2026 10:00:00",
      orderCode: "ADJ-20260718-01",
      partnerOrderId: "-",
      transactionType: "ADJUST_INCREASE" as const,
      initialAmount: "$44,500.00",
      amount: "+$5,000.00",
      finalAmount: "$49,500.00",
      description: "System adjustment: Promotional bonus credit",
    },
    {
      id: "6",
      date: "15/07/2026 17:05:40",
      orderCode: "ADJ-20260715-02",
      partnerOrderId: "-",
      transactionType: "ADJUST_DECREASE" as const,
      initialAmount: "$45,000.00",
      amount: "-$500.00",
      finalAmount: "$44,500.00",
      description: "System adjustment: Manual fee deduction",
    },
  ],
  meta: {
    total: 6,
    page: 1,
    perPage: 10,
  },
};

export default function TransactionTable() {
  const { languageId: currentLocale } = useI18n();
  const isLoading = false;

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const listData = MOCK_TRANSACTION_DATA;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  type TransactionType = (typeof MOCK_TRANSACTION_DATA)["data"][number];

  const renderTransactionTypeBadge = (type: TransactionItem["transactionType"]) => {
    switch (type) {
      case "PAID":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-200 font-medium">
            Paid
          </Badge>
        );
      case "ADDED_FUNDS":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-200 font-medium">
            Added Funds
          </Badge>
        );
      case "CANCELED":
        return (
          <Badge className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500/20 border-zinc-200 font-medium">
            Canceled
          </Badge>
        );
      case "REFUNDED":
        return (
          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border-purple-200 font-medium">
            Refunded
          </Badge>
        );
      case "ADJUST_INCREASE":
        return (
          <Badge className="bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 border-teal-200 font-medium">
            Adjust Balance Increase
          </Badge>
        );
      case "ADJUST_DECREASE":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border-rose-200 font-medium">
            Adjust Balance Decrease
          </Badge>
        );
      default:
        return null;
    }
  };

  const columns = [
    {
      header: translate("customerWallet.transactionTable.no", currentLocale) || "No.",
      width: 60,
      fixed: "left" as const,
      headerClassName: "text-center",
      className: "text-center font-medium text-muted-foreground",
      cell: (item: TransactionType) => {
        const index = listData.data.findIndex((row) => row.id === item.id);
        const rowNumber = (page - 1) * perPage + index + 1;
        return <div>{rowNumber}</div>;
      },
    },
    {
      header: translate("customerWallet.transactionTable.date", currentLocale) || "Date",
      width: 160,
      cell: (item: TransactionType) => <div>{item.date}</div>,
    },
    {
      header: translate("customerWallet.transactionTable.orderCode", currentLocale) || "Order code",
      width: 160,
      cell: (item: TransactionType) => (
        <span className="font-semibold text-[#0F798C]">{item.orderCode}</span>
      ),
    },
    {
      header:
        translate("customerWallet.transactionTable.partnerOrderId", currentLocale) ||
        "Partner Order ID",
      width: 150,
      cell: (item: TransactionType) => <div>{item.partnerOrderId}</div>,
    },
    {
      header:
        translate("customerWallet.transactionTable.transactionType", currentLocale) ||
        "Transaction type",
      width: 190,
      cell: (item: TransactionType) => renderTransactionTypeBadge(item.transactionType),
    },
    {
      header:
        translate("customerWallet.transactionTable.initialAmount", currentLocale) ||
        "Initial amount",
      width: 140,
      cell: (item: TransactionType) => (
        <span className="font-medium text-foreground">{item.initialAmount}</span>
      ),
    },
    {
      header: translate("customerWallet.transactionTable.amount", currentLocale) || "Amount",
      width: 140,
      cell: (item: TransactionType) => {
        const isPositive = item.amount.startsWith("+");
        const isNegative = item.amount.startsWith("-");
        return (
          <span
            className={`font-bold ${
              isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : isNegative
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground"
            }`}
          >
            {item.amount}
          </span>
        );
      },
    },
    {
      header:
        translate("customerWallet.transactionTable.finalAmount", currentLocale) || "Final amount",
      width: 140,
      cell: (item: TransactionType) => (
        <span className="font-bold text-foreground">{item.finalAmount}</span>
      ),
    },
    {
      header:
        translate("customerWallet.transactionTable.description", currentLocale) || "Description",
      width: 280,
      cell: (item: TransactionType) => (
        <div className="text-muted-foreground truncate" title={item.description}>
          {item.description}
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
          translate("customerWallet.transactionTable.noRecordsFound", currentLocale) ||
          "No transaction records found."
        }
        minWidth={1400}
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
              {translate("pagination.items", currentLocale) || "items"}
            </>
          )}
        />
      )}
    </Card>
  );
}
