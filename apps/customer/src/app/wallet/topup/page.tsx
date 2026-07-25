"use client";

import MyWallet from "@customer/app/wallet/topup/components/MyWallet";
import WalletCost from "@customer/app/wallet/topup/components/WalletCost";
import WalletFilter from "@customer/app/wallet/topup/components/WalletFilter";
import TopupTable from "@customer/app/wallet/topup/components/TopupTable";

export default function WalletTopupPage() {

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 2-Column Summary Cards Grid (Matching reference design) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: My Wallet */}
        <MyWallet />

        {/* Right Card: Fulfillment Cost */}
        <WalletCost />
      </div>

      {/*Filter*/}
      <WalletFilter />

      {/*Table*/}
      <TopupTable />
    </div>
  );
}
