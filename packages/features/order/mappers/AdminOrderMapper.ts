import type {
  CustomsStatus,
  LabelStatus,
  OrderStatus,
  PaymentStatus,
  ShippingMethod,
  ShippingOrigin,
} from "@ecom/prisma";

export interface AdminOrderSummaryResponse {
  id: string;
  orderCode: string;
  customerId: string;
  customer?: {
    name: string;
    email: string;
    username: string;
    phone?: string | null;
  } | null;
  importId: string | null;
  status: OrderStatus;
  labelStatus: LabelStatus;
  exportCustomsStatus: CustomsStatus;
  importCustomsStatus: CustomsStatus;
  paymentStatus: PaymentStatus;
  shippingMethod: ShippingMethod;
  shippingOrigin: ShippingOrigin;
  sellerOrderId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  ecomTrackingNumber: string | null;
  mawb: string | null;
  flightNumber: string | null;
  receiverName: string;
  receiverPhone: string | null;
  receiverCity: string;
  receiverState: string;
  receiverCountry: string;
  receiverZipCode: string;
  receiverAddress1: string;
  declaredWeight: number;
  baseShippingFee: number;
  surchargeFee: number;
  totalFee: number;
  rateCardId: number | null;
  boxId: string | null;
  port: string | null;
  version: number;
  createdAt: Date | string;
}

export interface AdminOrderDetailResponse extends AdminOrderSummaryResponse {
  totalPackets: number;
  senderName: string | null;
  senderPhone: string | null;
  senderEmail: string | null;
  senderAddress: string | null;
  senderWard: string | null;
  senderCity: string | null;
  senderState: string | null;
  senderCountry: string | null;
  senderZipCode: string | null;
  receiverEmail: string | null;
  receiverAddress2: string | null;
  detailDescription: string;
  dimensionText: string | null;
  dimensionLength: number | null;
  dimensionWidth: number | null;
  dimensionHeight: number | null;
  declaredValue: number;
  packagingCode: string | null;
  packingTypeId: number | null;
  actualWeight: number | null;
  volumeWeight: number | null;
  chargeableWeight: number | null;
  isGetLabel: number;
  updatedAt: Date | string;

  import?: Record<string, unknown> | null;
  feeItems?: Record<string, unknown>[];
  products?: Record<string, unknown>[];
  trackingCheckpoints?: Record<string, unknown>[];
  activityLogs?: Record<string, unknown>[];
  partners?: Record<string, unknown>[];
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  return Number(val);
}

function toNullableNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  return Number(val);
}

/**
 * Maps an order database record to a comprehensive Admin Order Summary DTO.
 * Includes customer info, carrier tracking, customs statuses, and converts Decimal objects.
 */
// biome-ignore lint/suspicious/noExplicitAny: mapper receives untyped prisma order object
export function mapToAdminOrderSummaryResponse(order: any): AdminOrderSummaryResponse {
  return {
    id: order.id,
    orderCode: order.orderCode,
    customerId: order.customerId,
    customer: order.customer
      ? {
          name: order.customer.name,
          email: order.customer.email,
          username: order.customer.username,
          phone: order.customer.phone ?? null,
        }
      : null,
    importId: order.importId ?? null,
    status: order.status,
    labelStatus: order.labelStatus,
    exportCustomsStatus: order.exportCustomsStatus,
    importCustomsStatus: order.importCustomsStatus,
    paymentStatus: order.paymentStatus,
    shippingMethod: order.shippingMethod,
    shippingOrigin: order.shippingOrigin,
    sellerOrderId: order.sellerOrderId ?? null,
    trackingNumber: order.trackingNumber ?? null,
    labelUrl: order.labelUrl ?? null,
    ecomTrackingNumber: order.ecomTrackingNumber ?? null,
    mawb: order.mawb ?? null,
    flightNumber: order.flightNumber ?? null,
    receiverName: order.receiverName,
    receiverPhone: order.receiverPhone ?? null,
    receiverCity: order.receiverCity,
    receiverState: order.receiverState,
    receiverCountry: order.receiverCountry,
    receiverZipCode: order.receiverZipCode,
    receiverAddress1: order.receiverAddress1,
    declaredWeight: order.declaredWeight,
    baseShippingFee: toNumber(order.baseShippingFee),
    surchargeFee: toNumber(order.surchargeFee),
    totalFee: toNumber(order.totalFee),
    rateCardId: order.rateCardId ?? null,
    boxId: order.boxId ?? null,
    port: order.port ?? null,
    version: order.version ?? 0,
    createdAt: order.createdAt,
  };
}

/**
 * Maps a full order database record to a complete Admin Order Detail DTO including activity logs & partners.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: detailed order DTO maps 30+ relational fields
// biome-ignore lint/suspicious/noExplicitAny: mapper receives untyped prisma order object
export function mapToAdminOrderDetailResponse(order: any): AdminOrderDetailResponse {
  const summary = mapToAdminOrderSummaryResponse(order);
  return {
    ...summary,
    totalPackets: order.totalPackets ?? 1,
    senderName: order.senderName ?? null,
    senderPhone: order.senderPhone ?? null,
    senderEmail: order.senderEmail ?? null,
    senderAddress: order.senderAddress ?? null,
    senderWard: order.senderWard ?? null,
    senderCity: order.senderCity ?? null,
    senderState: order.senderState ?? null,
    senderCountry: order.senderCountry ?? null,
    senderZipCode: order.senderZipCode ?? null,

    receiverEmail: order.receiverEmail ?? null,
    receiverAddress2: order.receiverAddress2 ?? null,

    detailDescription: order.detailDescription ?? "",
    dimensionText: order.dimensionText ?? null,
    dimensionLength: toNullableNumber(order.dimensionLength),
    dimensionWidth: toNullableNumber(order.dimensionWidth),
    dimensionHeight: toNullableNumber(order.dimensionHeight),
    declaredValue: toNumber(order.declaredValue),
    packagingCode: order.packagingCode ?? null,
    packingTypeId: order.packingTypeId ?? null,
    actualWeight: toNullableNumber(order.actualWeight),
    volumeWeight: toNullableNumber(order.volumeWeight),
    chargeableWeight: toNullableNumber(order.chargeableWeight),
    isGetLabel: order.isGetLabel ?? 0,
    updatedAt: order.updatedAt ?? order.createdAt,

    import: order.import ?? null,
    feeItems: Array.isArray(order.feeItems)
      ? order.feeItems.map((fee: Record<string, unknown>) => ({
          ...fee,
          amount: toNumber(fee.amount),
        }))
      : [],
    products: Array.isArray(order.products)
      ? order.products.map((p: Record<string, unknown>) => ({
          ...p,
          value: toNumber(p.value),
        }))
      : [],
    trackingCheckpoints: order.trackingCheckpoints ?? [],
    activityLogs: order.activityLogs ?? [],
    partners: order.partners ?? [],
  };
}
