export const IS_BANK = {
  TRUE: true,
  FALSE: false,
} as const;

export type IS_BANK = (typeof IS_BANK)[keyof typeof IS_BANK];

export function buildAssetUrl(relativePath?: string | null): string | null {
  if (!relativePath) return null;
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }
  const apiDomain =
    process.env.API_BASE_URL ||
    process.env.PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://dev-api.ecomexpress.vn"
      : "http://localhost:4000");

  const cleanDomain = apiDomain.replace(/\/$/, "");
  const cleanPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${cleanDomain}${cleanPath}`;
}

export function mapTopupPaymentMethodToResponse(pm: any) {
  if (!pm) return null;
  return {
    id: pm.id,
    name: pm.name,
    status: pm.status,
    isBank: Boolean(pm.isBank),
    icon: buildAssetUrl(pm.icon),
    image: buildAssetUrl(pm.image),
    position: pm.position,
    dataInfo: pm.dataInfo,
    createdAt: pm.createdAt ? new Date(pm.createdAt).toISOString() : "",
    updatedAt: pm.updatedAt ? new Date(pm.updatedAt).toISOString() : "",
  };
}

export function mapTopupTransactionToResponse(item: any) {
  return {
    id: String(item.id),
    transactionCode: item.transactionCode,
    orderCode: item.orderCode ?? item.transactionCode,
    submissionDate: item.submissionDate ? new Date(item.submissionDate).toISOString() : "",
    wireDate: item.wireDate ? new Date(item.wireDate).toISOString() : "",
    paymentMethodId: item.paymentMethodId,
    paymentMethod: item.paymentMethod?.name ?? "Other",
    wireTransferConfirmation: item.transactionCode,
    status: item.status,
    wireAmount: item.wireAmount ? Number(item.wireAmount) : 0,
    wireAmountApproved: item.wireAmountApprove ? Number(item.wireAmountApprove) : 0,
    rate: item.rate ? Number(item.rate) : null,
    description: item.description ?? "",
    accountBalanceBefore: Number(item.accountBalanceBefore ?? 0),
    amountChange: Number(item.amountChange ?? 0),
    accountBalanceAfter: Number(item.accountBalanceAfter ?? 0),
    wireImages: item.wireImages
      ? item.wireImages.map((img: any) => buildAssetUrl(img.imageUrl))
      : [],
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : "",
  };
}
