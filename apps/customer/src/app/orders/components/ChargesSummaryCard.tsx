export interface ChargesData {
  baseShippingRate: number;
  fuelSurcharge: number;
  chargeableWeightKg: number;
  totalAmount: number;
}

export interface ChargesSummaryCardProps {
  data: ChargesData;
}

export function ChargesSummaryCard({ data }: ChargesSummaryCardProps) {
  const { baseShippingRate, fuelSurcharge, chargeableWeightKg, totalAmount } = data;

  return (
    <div className="flex flex-col rounded-lg border border-[#0F798C] bg-[#CFFEF9] p-5 gap-4 shadow-sm">
      <h3 className="text-sm 2xl:text-xl font-medium text-[#232323]">Charges & Surcharges</h3>
      <div className="flex flex-col gap-3 text-sm text-[#232323]">
        <div className="flex justify-between items-center text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B]">Base Shipping Rate</span>
          <span className="font-medium text-[#232323]">${baseShippingRate.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B]">Fuel Surcharge</span>
          <span className="font-medium text-[#232323]">${fuelSurcharge.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B]">Chargeable Weight</span>
          <span className="font-medium text-[#232323]">{chargeableWeightKg.toFixed(2)} kg</span>
        </div>

        <div className="border-t border-dashed border-[#5BCACE] my-1" />

        <div className="flex justify-between items-center text-sm 2xl:text-xl">
          <span className="text-lg text-[#232323]">TOTAL AMOUNT</span>
          <span className="text-xl font-bold text-[#0042D0]">${totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
