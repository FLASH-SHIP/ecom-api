import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";

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
  const { languageId: currentLocale } = useI18n();
  const { baseShippingRate, fuelSurcharge, chargeableWeightKg, totalAmount } = data;

  return (
    <div className="flex flex-col rounded-lg border border-[#0F798C] bg-[#CFFEF9] p-5 gap-4 shadow-sm">
      <h3 className="text-sm 2xl:text-xl font-medium text-[#232323]">
        {translate("customerOrder.summaryCards.chargesSurcharges", currentLocale)}
      </h3>
      <div className="flex flex-col gap-3 text-sm text-[#232323]">
        <div className="flex justify-between items-center text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B]">
            {translate("customerOrder.summaryCards.baseShippingRate", currentLocale)}
          </span>
          <span className="font-medium text-[#232323]">${baseShippingRate.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B]">
            {translate("customerOrder.summaryCards.fuelSurcharge", currentLocale)}
          </span>
          <span className="font-medium text-[#232323]">${fuelSurcharge.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B]">
            {translate("customerOrder.summaryCards.chargeableWeight", currentLocale)}
          </span>
          <span className="font-medium text-[#232323]">{chargeableWeightKg.toFixed(2)} kg</span>
        </div>

        <div className="border-t border-dashed border-[#5BCACE] my-1" />

        <div className="flex justify-between items-center text-sm 2xl:text-xl">
          <span className="text-lg text-[#232323]">
            {translate("customerOrder.summaryCards.totalAmount", currentLocale)}
          </span>
          <span className="text-xl font-bold text-[#0042D0]">${totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
