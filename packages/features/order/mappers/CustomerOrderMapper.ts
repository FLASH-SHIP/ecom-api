export interface CustomerOrderSummaryResponse {
  id: string;
  orderCode: string;
  sellerOrderId: string | null;
  status: string;
  labelStatus: string;
  shippingMethod: string;
  shippingOrigin: string;
  ecomTrackingNumber: string | null;
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
  createdAt: Date | string;
}

export interface CustomerOrderFeeItemResponse {
  id: number;
  feeType: string;
  name: string;
  amount: number;
  currency: string;
  createdAt: Date | string;
}

export interface CustomerOrderProductResponse {
  id: number;
  description: string;
  quantity: number;
  value: number;
  hsCode: string | null;
  originCountry: string | null;
  weight: number | null;
  sku: string | null;
}

export interface CustomerOrderCheckpointResponse {
  id: number;
  checkpointDate: Date | string;
  location: string | null;
  description: string;
  carrierCode: string | null;
}

export interface CustomerOrderDetailResponse extends CustomerOrderSummaryResponse {
  totalPackets: number;
  exportCustomsStatus?: string;
  importCustomsStatus?: string;
  paymentStatus?: string;

  // Sender Info
  senderName: string | null;
  senderPhone: string | null;
  senderEmail: string | null;
  senderAddress: string | null;
  senderWard: string | null;
  senderCity: string | null;
  senderState: string | null;
  senderCountry: string | null;
  senderZipCode: string | null;

  // Receiver Detail (Address2)
  receiverEmail: string | null;
  receiverAddress2: string | null;

  // Measurements
  detailDescription: string;
  dimensionText: string | null;
  dimensionLength: number | null;
  dimensionWidth: number | null;
  dimensionHeight: number | null;
  declaredValue: number;
  packagingCode: string | null;
  actualWeight: number | null;
  volumeWeight: number | null;
  chargeableWeight: number | null;

  // Relations
  feeItems?: CustomerOrderFeeItemResponse[];
  products?: CustomerOrderProductResponse[];
  trackingCheckpoints?: CustomerOrderCheckpointResponse[];

  updatedAt: Date | string;
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
 * Maps a single order database record to a clean, public Customer Order Summary DTO.
 * Excludes internal fields (version, rateCardId, boxId, port, carrier tracking, etc.)
 * and converts Prisma Decimal objects to JavaScript numbers.
 */
export function mapToCustomerOrderSummaryResponse(order: any): CustomerOrderSummaryResponse {
  return {
    id: order.id,
    orderCode: order.orderCode,
    sellerOrderId: order.sellerOrderId ?? null,
    status: order.status,
    labelStatus: order.labelStatus,
    shippingMethod: order.shippingMethod,
    shippingOrigin: order.shippingOrigin,
    ecomTrackingNumber: order.ecomTrackingNumber ?? null,
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
    createdAt: order.createdAt,
  };
}

/**
 * Maps a full order database record to a detailed public Customer Order DTO.
 */
export function mapToCustomerOrderDetailResponse(order: any): CustomerOrderDetailResponse {
  const summary = mapToCustomerOrderSummaryResponse(order);
  return {
    ...summary,
    totalPackets: order.totalPackets ?? 1,
    exportCustomsStatus: order.exportCustomsStatus,
    importCustomsStatus: order.importCustomsStatus,
    paymentStatus: order.paymentStatus,

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
    actualWeight: toNullableNumber(order.actualWeight),
    volumeWeight: toNullableNumber(order.volumeWeight),
    chargeableWeight: toNullableNumber(order.chargeableWeight),

    feeItems: Array.isArray(order.feeItems)
      ? order.feeItems.map((fee: any) => ({
          id: fee.id,
          feeType: fee.feeType,
          name: fee.name,
          amount: toNumber(fee.amount),
          currency: fee.currency ?? "USD",
          createdAt: fee.createdAt,
        }))
      : [],

    products: Array.isArray(order.products)
      ? order.products.map((p: any) => ({
          id: p.id,
          description: p.description,
          quantity: p.quantity,
          value: toNumber(p.value),
          hsCode: p.hsCode ?? null,
          originCountry: p.originCountry ?? null,
          weight: p.weight ?? null,
          sku: p.sku ?? null,
        }))
      : [],

    trackingCheckpoints: Array.isArray(order.trackingCheckpoints)
      ? order.trackingCheckpoints.map((cp: any) => ({
          id: cp.id,
          checkpointDate: cp.checkpointDate,
          location: cp.location ?? null,
          description: cp.description,
          carrierCode: cp.carrierCode ?? null,
        }))
      : [],

    updatedAt: order.updatedAt ?? order.createdAt,
  };
}

/**
 * Maps freight estimation calculation result to clean public Customer DTO.
 */
export function mapToEstimateFreightResponse(result: any) {
  return {
    baseShippingFee: toNumber(result.baseShippingRate ?? result.baseShippingFee),
    surchargeFee: toNumber(result.surchargeFee),
    totalFee: toNumber(result.totalAmount ?? result.totalFee),
    volumeWeight: result.volumeWeight,
    chargeableWeight: result.chargeableWeight,
  };
}
