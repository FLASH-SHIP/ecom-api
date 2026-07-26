"use client";

import TransactionFilter from "@customer/app/wallet/transaction/components/TransactionFilter";
import TransactionTable from "@customer/app/wallet/transaction/components/TransactionTable";

export default function TransactionPage() {
  return (
    <>
      <div className="flex flex-col gap-5 w-full">
        {/*Filter*/}
        <TransactionFilter />

        {/*Table*/}
        <TransactionTable />
      </div>
    </>
  );
}
