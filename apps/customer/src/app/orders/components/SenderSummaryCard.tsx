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
  const { senderName, cityStateCountry, senderAddress, senderZipCode, senderPhone, senderEmail } =
    data;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
      <div className="px-5 py-3.5 border-b border-[#DADADA] bg-[#FEFCFA]">
        <h3 className="text-base 2xl:text-xl font-medium text-[#232323]">Sender</h3>
      </div>
      <div className="p-5 flex flex-col gap-3 text-sm">
        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Sender Name</span>
          <span className="font-medium text-[#232323]">{senderName || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">City/Ward</span>
          <span className="font-medium text-[#232323]">{cityStateCountry || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Address</span>
          <span className="font-medium text-[#232323]">{senderAddress || "N/A"}</span>
        </div>

        {senderZipCode && (
          <div className="flex items-start text-sm 2xl:text-xl">
            <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Zip/Post code</span>
            <span className="font-medium text-[#232323]">{senderZipCode}</span>
          </div>
        )}

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Phone Number</span>
          <span className="font-medium text-[#232323]">{senderPhone || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Email</span>
          <span className="font-medium text-[#232323]">{senderEmail || "N/A"}</span>
        </div>
      </div>
    </div>
  );
}
