import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";

export interface BasicInfoData {
  shippingOrigin?: string | null;
  orderId?: string | null;
  shippingMethod?: string | null;
  detailDescription?: string | null;
  createdTime?: string | null;
}

export interface BasicInfoSummaryCardProps {
  data: BasicInfoData;
}

export function BasicInfoSummaryCard({ data }: BasicInfoSummaryCardProps) {
  const { languageId: currentLocale } = useI18n();
  const { shippingOrigin, orderId, shippingMethod, detailDescription, createdTime } = data;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
      <div className="px-5 py-3.5 border-b border-[#DADADA] bg-[#FEFCFA]">
        <h3 className="text-base 2xl:text-xl font-medium text-[#232323]">
          {translate("customerOrder.summaryCards.basicInfo", currentLocale)}
        </h3>
      </div>
      <div className="p-5 flex flex-col gap-3 text-sm">
        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">
            {translate("customerOrder.summaryCards.shippingOrigin", currentLocale)}
          </span>
          <span className="font-medium text-[#232323]">{shippingOrigin || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">
            {translate("customerOrder.summaryCards.orderId", currentLocale)}
          </span>
          <span className="font-semibold text-[#0F798C]">{orderId || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">
            {translate("customerOrder.summaryCards.shippingMethod", currentLocale)}
          </span>
          <span className="font-medium text-[#232323]">{shippingMethod || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">
            {translate("customerOrder.summaryCards.detailsDescription", currentLocale)}
          </span>
          <span className="font-medium text-[#232323]">{detailDescription || "N/A"}</span>
        </div>

        {createdTime && (
          <div className="flex items-start text-sm 2xl:text-xl">
            <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">
              {translate("customerOrder.summaryCards.createdTime", currentLocale)}
            </span>
            <span className="font-medium text-[#232323]">{createdTime}</span>
          </div>
        )}
      </div>
    </div>
  );
}
