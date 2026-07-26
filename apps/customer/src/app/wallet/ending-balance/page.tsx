"use client";

import EndingBalanceFilter from "@customer/app/wallet/ending-balance/components/EndingBalanceFilter";
import EndingBalanceTable from "@customer/app/wallet/ending-balance/components/EndingBalanceTable";

export default function EndingBalancePage() {
  return (
    <>
      <div className="flex flex-col gap-5 w-full">
        {/*Filter*/}
        <EndingBalanceFilter />

        {/*Table*/}
        <EndingBalanceTable />
      </div>
    </>
  );
}
