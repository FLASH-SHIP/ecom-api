export interface RecipientData {
  receiverName?: string | null;
  cityStateCountry?: string | null;
  receiverAddress1?: string | null;
  receiverAddress2?: string | null;
  receiverZipCode?: string | null;
  receiverPhone?: string | null;
  receiverEmail?: string | null;
}

export interface RecipientSummaryCardProps {
  data: RecipientData;
}

export function RecipientSummaryCard({ data }: RecipientSummaryCardProps) {
  const {
    receiverName,
    cityStateCountry,
    receiverAddress1,
    receiverAddress2,
    receiverZipCode,
    receiverPhone,
    receiverEmail,
  } = data;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
      <div className="px-5 py-3.5 border-b border-[#DADADA] bg-[#FEFCFA]">
        <h3 className="text-base 2xl:text-xl font-medium text-[#232323]">Recipient</h3>
      </div>
      <div className="p-5 flex flex-col gap-3 text-sm">
        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Recipient Name</span>
          <span className="font-semibold text-[#0F798C]">{receiverName || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">City/State/Country</span>
          <span className="font-medium text-[#232323]">{cityStateCountry || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Address 1</span>
          <span className="font-medium text-[#232323]">{receiverAddress1 || "N/A"}</span>
        </div>

        {receiverAddress2 && (
          <div className="flex items-start text-sm 2xl:text-xl">
            <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Address 2</span>
            <span className="font-medium text-[#232323]">{receiverAddress2}</span>
          </div>
        )}

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Zip/Post code</span>
          <span className="font-medium text-[#232323]">{receiverZipCode || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Phone Number</span>
          <span className="font-medium text-[#232323]">{receiverPhone || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Email</span>
          <span className="font-medium text-[#232323]">{receiverEmail || "N/A"}</span>
        </div>
      </div>
    </div>
  );
}
