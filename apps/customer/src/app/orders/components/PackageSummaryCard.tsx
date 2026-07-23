export interface PackageData {
  value?: string | number | null;
  dimensions?: string | null;
  weight?: string | number | null;
  volumeWeight?: string | number | null;
  hsCode?: string | null;
}

export interface PackageSummaryCardProps {
  data: PackageData;
}

export function PackageSummaryCard({ data }: PackageSummaryCardProps) {
  const { value, dimensions, weight, volumeWeight, hsCode } = data;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
      <div className="px-5 py-3.5 border-b border-[#DADADA] bg-[#FEFCFA]">
        <h3 className="text-base 2xl:text-xl font-medium text-[#232323]">Package</h3>
      </div>
      <div className="p-5 flex flex-col gap-3 text-sm">
        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Value</span>
          <span className="font-medium text-[#232323]">${value ?? 0}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Dimensions</span>
          <span className="font-medium text-[#232323]">{dimensions || "N/A"}</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Weight</span>
          <span className="font-medium text-[#232323]">{weight ?? 0} gr</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">Volume Weight</span>
          <span className="font-medium text-[#232323]">{volumeWeight ?? 0} gr</span>
        </div>

        <div className="flex items-start text-sm 2xl:text-xl">
          <span className="text-[#7B7B7B] w-36 2xl:w-46 flex-shrink-0">HS Code</span>
          <span className="font-medium text-[#232323]">{hsCode || "N/A"}</span>
        </div>
      </div>
    </div>
  );
}
