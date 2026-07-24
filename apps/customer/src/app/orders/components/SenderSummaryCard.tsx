import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";

export interface SenderData {
  senderName?: string | null;
  cityStateCountry?: string | null;
  senderAddress?: string | null;
  senderZipCode?: string | null;
  senderPhone?: string | null;
  senderEmail?: string | null;
}

export interface SenderSummaryCardProps {
  data: SenderData;
}

export function SenderSummaryCard({ data }: SenderSummaryCardProps) {
  const { languageId: currentLocale } = useI18n();
  const { senderName, cityStateCountry, senderAddress, senderZipCode, senderPhone, senderEmail } =
    data;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
      <div className="px-5 py-3.5 border-b border-[#DADADA] bg-[#FEFCFA]">
        <h3 className="text-base 2xl:text-xl font-medium text-[#232323]">
          {translate("customerOrder.summaryCards.sender", currentLocale)}
        </h3>
      </div>
      <div className="p-5 flex flex-col gap-3 text-sm">
        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">
            {translate("customerOrder.summaryCards.senderName", currentLocale)}
          </span>
          <span className="font-medium text-[#232323]">{senderName || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">
            {translate("customerOrder.summaryCards.cityWard", currentLocale)}
          </span>
          <span className="font-medium text-[#232323]">{cityStateCountry || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">
            {translate("customerOrder.summaryCards.address", currentLocale)}
          </span>
          <span className="font-medium text-[#232323]">{senderAddress || "N/A"}</span>
        </div>

        {senderZipCode && (
          <div className="flex items-start text-sm 2xl:text-xl">
            <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">
              {translate("customerOrder.summaryCards.zipPostcode", currentLocale)}
            </span>
            <span className="font-medium text-[#232323]">{senderZipCode}</span>
          </div>
        )}

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">
            {translate("customerOrder.summaryCards.phoneNumber", currentLocale)}
          </span>
          <span className="font-medium text-[#232323]">{senderPhone || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">
            {translate("customerOrder.summaryCards.email", currentLocale)}
          </span>
          <span className="font-medium text-[#232323]">{senderEmail || "N/A"}</span>
        </div>
      </div>
    </div>
  );
}
