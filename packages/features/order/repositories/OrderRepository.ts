import { ErrorCode } from "@ecom/lib/errorCodes";
import { ErrorWithCode } from "@ecom/lib/errors";
import { normalizePagination, paginate } from "@ecom/lib/pagination";
import type {
  ActorType,
  CustomsStatus,
  LabelStatus,
  OrderStatus,
  PaymentStatus,
  PrismaClient,
  ShippingMethod,
  ShippingOrigin,
} from "@ecom/prisma";
import { Prisma } from "@ecom/prisma";

export interface CreateOrderInput {
  orderCode: string;
  customerId: string;
  importId?: string | null;
  status?: OrderStatus;
  labelStatus?: LabelStatus;
  exportCustomsStatus?: CustomsStatus;
  importCustomsStatus?: CustomsStatus;
  paymentStatus?: PaymentStatus;
  shippingMethod: ShippingMethod;
  shippingOrigin?: ShippingOrigin;
  sellerOrderId?: string | null;
  trackingNumber?: string | null;

  // Sender details
  senderName?: string | null;
  senderAddress?: string | null;
  senderPhone?: string | null;
  senderEmail?: string | null;
  senderCountry?: string | null;
  senderState?: string | null;
  senderCity?: string | null;
  senderWard?: string | null;
  senderZipCode?: string | null;

  // Receiver details
  receiverName: string;
  receiverPhone?: string | null;
  receiverEmail?: string | null;
  receiverCity: string;
  receiverState: string;
  receiverAddress1: string;
  receiverAddress2?: string | null;
  receiverCountry: string;
  receiverZipCode: string;

  // Cargo details
  detailDescription: string;
  declaredWeight: number;
  dimensionText?: string | null;
  dimensionLength?: Prisma.Decimal | number | null;
  dimensionWidth?: Prisma.Decimal | number | null;
  dimensionHeight?: Prisma.Decimal | number | null;
  declaredValue: Prisma.Decimal | number;
  packingTypeId?: number | null;
  packagingCode?: string | null;

  // Warehouse measurement
  actualWeight?: Prisma.Decimal | number | null;
  volumeWeight?: Prisma.Decimal | number | null;
  chargeableWeight?: Prisma.Decimal | number | null;
  mawb?: string | null;
  flightNumber?: string | null;
  ecomTrackingNumber?: string | null;

  // Pricing
  rateCardId?: number | null;
  baseShippingFee: Prisma.Decimal | number;
  surchargeFee?: Prisma.Decimal | number;
  totalFee: Prisma.Decimal | number;

  boxId?: string | null;
  port?: string | null;
  isGetLabel?: number;
  feeItems?: Prisma.OrderFeeItemUncheckedCreateNestedManyWithoutOrderInput;
  products?: Prisma.OrderProductUncheckedCreateNestedManyWithoutOrderInput;
}

export interface UpdateOrderInput {
  status?: OrderStatus;
  labelStatus?: LabelStatus;
  exportCustomsStatus?: CustomsStatus;
  importCustomsStatus?: CustomsStatus;
  paymentStatus?: PaymentStatus;
  trackingNumber?: string | null;
  actualWeight?: Prisma.Decimal | number | null;
  volumeWeight?: Prisma.Decimal | number | null;
  chargeableWeight?: Prisma.Decimal | number | null;
  mawb?: string | null;
  flightNumber?: string | null;
  ecomTrackingNumber?: string | null;
  boxId?: string | null;
  port?: string | null;
  isGetLabel?: number;
  expectedVersion?: number;
}

export interface OrderQueryOptions {
  customerId?: string;
  status?: OrderStatus;
  orderCode?: string;
  sellerOrderId?: string;
  shippingMethod?: ShippingMethod;
  fromDate?: Date | string;
  toDate?: Date | string;
  search?: string;
  page?: number;
  perPage?: number;
  sortBy?: "id" | "createdAt" | "orderCode" | "status";
  sortOrder?: "asc" | "desc";
}

export class OrderRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderCode: true,
        customerId: true,
        importId: true,
        status: true,
        labelStatus: true,
        exportCustomsStatus: true,
        importCustomsStatus: true,
        paymentStatus: true,
        shippingMethod: true,
        shippingOrigin: true,
        sellerOrderId: true,
        trackingNumber: true,
        senderName: true,
        senderAddress: true,
        senderPhone: true,
        senderEmail: true,
        senderCountry: true,
        senderState: true,
        senderCity: true,
        senderWard: true,
        senderZipCode: true,
        receiverName: true,
        receiverPhone: true,
        receiverEmail: true,
        receiverCity: true,
        receiverState: true,
        receiverAddress1: true,
        receiverAddress2: true,
        receiverCountry: true,
        receiverZipCode: true,
        detailDescription: true,
        declaredWeight: true,
        dimensionText: true,
        dimensionLength: true,
        dimensionWidth: true,
        dimensionHeight: true,
        declaredValue: true,
        packingTypeId: true,
        packagingCode: true,
        actualWeight: true,
        volumeWeight: true,
        chargeableWeight: true,
        mawb: true,
        flightNumber: true,
        ecomTrackingNumber: true,
        rateCardId: true,
        baseShippingFee: true,
        surchargeFee: true,
        totalFee: true,
        boxId: true,
        port: true,
        isGetLabel: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            name: true,
            email: true,
            username: true,
            phone: true,
          },
        },
        feeItems: {
          select: {
            id: true,
            feeType: true,
            name: true,
            amount: true,
            currency: true,
            rateCardItemId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        products: {
          select: {
            id: true,
            description: true,
            quantity: true,
            value: true,
            hsCode: true,
            originCountry: true,
            weight: true,
            sku: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async findByCode(orderCode: string) {
    return this.prisma.order.findUnique({
      where: { orderCode },
      select: {
        id: true,
        orderCode: true,
        customerId: true,
        status: true,
        labelStatus: true,
        exportCustomsStatus: true,
        importCustomsStatus: true,
        paymentStatus: true,
        shippingMethod: true,
        shippingOrigin: true,
        sellerOrderId: true,
        trackingNumber: true,
        totalFee: true,
        createdAt: true,
      },
    });
  }

  async findBySellerOrderId(customerId: string, sellerOrderId: string) {
    return this.prisma.order.findUnique({
      where: {
        customerId_sellerOrderId: {
          customerId,
          sellerOrderId,
        },
      },
      select: {
        id: true,
        orderCode: true,
        sellerOrderId: true,
      },
    });
  }

  async findMany(options: OrderQueryOptions) {
    const {
      customerId,
      status,
      orderCode,
      sellerOrderId,
      shippingMethod,
      fromDate,
      toDate,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;
    const { page, perPage, skip } = normalizePagination(options);

    const conditions: Prisma.OrderWhereInput[] = [];

    if (customerId !== undefined) {
      conditions.push({ customerId });
    }

    if (status) {
      conditions.push({ status });
    }

    if (orderCode?.trim()) {
      conditions.push({ orderCode: { contains: orderCode.trim(), mode: "insensitive" } });
    }

    if (sellerOrderId?.trim()) {
      conditions.push({ sellerOrderId: { contains: sellerOrderId.trim(), mode: "insensitive" } });
    }

    if (shippingMethod) {
      conditions.push({ shippingMethod });
    }

    if (fromDate || toDate) {
      const createdAtCondition: Prisma.DateTimeFilter = {};
      if (fromDate) {
        createdAtCondition.gte =
          typeof fromDate === "string" ? new Date(`${fromDate}T00:00:00.000Z`) : fromDate;
      }
      if (toDate) {
        createdAtCondition.lte =
          typeof toDate === "string" ? new Date(`${toDate}T23:59:59.999Z`) : toDate;
      }
      conditions.push({ createdAt: createdAtCondition });
    }

    if (search?.trim()) {
      const q = search.trim();
      conditions.push({
        OR: [
          { orderCode: { contains: q, mode: "insensitive" } },
          { trackingNumber: { contains: q, mode: "insensitive" } },
          { sellerOrderId: { contains: q, mode: "insensitive" } },
          { receiverName: { contains: q, mode: "insensitive" } },
          { receiverPhone: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.OrderWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderCode: true,
          customerId: true,
          status: true,
          labelStatus: true,
          shippingMethod: true,
          shippingOrigin: true,
          sellerOrderId: true,
          ecomTrackingNumber: true,
          receiverName: true,
          receiverPhone: true,
          receiverCity: true,
          receiverState: true,
          receiverCountry: true,
          receiverZipCode: true,
          receiverAddress1: true,
          declaredWeight: true,
          baseShippingFee: true,
          surchargeFee: true,
          totalFee: true,
          createdAt: true,
          customer: {
            select: {
              name: true,
              email: true,
              username: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: perPage,
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(items, total, page, perPage);
  }

  async create(data: CreateOrderInput, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.order.create({
      data: {
        ...data,
      },
      select: {
        id: true,
        orderCode: true,
        status: true,
        totalFee: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, data: UpdateOrderInput, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    const { expectedVersion, ...updateData } = data;

    if (expectedVersion !== undefined) {
      const updated = await client.order.updateMany({
        where: { id, version: expectedVersion },
        data: {
          ...updateData,
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ErrorWithCode(
          ErrorCode.Conflict,
          "Đơn hàng đã được cập nhật bởi một phiên làm việc khác. Vui lòng tải lại trang.",
          409,
        );
      }

      const fresh = await client.order.findUnique({
        where: { id },
        select: {
          id: true,
          orderCode: true,
          status: true,
          labelStatus: true,
          exportCustomsStatus: true,
          importCustomsStatus: true,
          paymentStatus: true,
          version: true,
          updatedAt: true,
        },
      });

      if (!fresh) {
        throw new ErrorWithCode(ErrorCode.NotFound, "Đơn hàng không tồn tại", 404);
      }

      return fresh;
    }

    return client.order.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        orderCode: true,
        status: true,
        labelStatus: true,
        exportCustomsStatus: true,
        importCustomsStatus: true,
        paymentStatus: true,
        version: true,
        updatedAt: true,
      },
    });
  }

  async createActivityLog(
    data: {
      orderId: string;
      action: string;
      statusFrom?: string | null;
      statusTo?: string | null;
      description: string;
      metadata?: Prisma.InputJsonValue | null;
      actorType: ActorType;
      actorId: string;
      actorName: string;
      actorUsername: string;
      actorEmail?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.orderActivityLog.create({
      data: {
        ...data,
        metadata: data.metadata ?? Prisma.DbNull,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });
  }

  async findActivityLogs(orderId: string) {
    return this.prisma.orderActivityLog.findMany({
      where: { orderId },
      select: {
        id: true,
        action: true,
        statusFrom: true,
        statusTo: true,
        description: true,
        metadata: true,
        actorType: true,
        actorId: true,
        actorName: true,
        actorUsername: true,
        actorEmail: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async upsertTrackingCheckpoint(
    data: {
      orderId: string;
      checkpointDate: Date;
      location?: string | null;
      description: string;
      carrierCode?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    // We upsert by composite key to prevent duplicates
    return client.orderTrackingCheckpoint.upsert({
      where: {
        orderId_checkpointDate_description: {
          orderId: data.orderId,
          checkpointDate: data.checkpointDate,
          description: data.description,
        },
      },
      create: data,
      update: {
        location: data.location,
        carrierCode: data.carrierCode,
      },
      select: {
        id: true,
      },
    });
  }

  async findTrackingCheckpoints(orderId: string) {
    return this.prisma.orderTrackingCheckpoint.findMany({
      where: { orderId },
      select: {
        id: true,
        checkpointDate: true,
        location: true,
        description: true,
        carrierCode: true,
        createdAt: true,
      },
      orderBy: { checkpointDate: "desc" },
    });
  }

  async findByIdOrCodeForCustomer(customerId: string, identifier: string) {
    return this.prisma.order.findFirst({
      where: {
        customerId,
        OR: [{ id: identifier }, { orderCode: identifier }, { sellerOrderId: identifier }],
      },
      select: {
        id: true,
        orderCode: true,
        status: true,
        labelStatus: true,
        exportCustomsStatus: true,
        importCustomsStatus: true,
        paymentStatus: true,
        shippingMethod: true,
        shippingOrigin: true,
        sellerOrderId: true,
        senderName: true,
        senderAddress: true,
        senderPhone: true,
        senderEmail: true,
        senderCountry: true,
        senderState: true,
        senderCity: true,
        senderWard: true,
        senderZipCode: true,
        receiverName: true,
        receiverPhone: true,
        receiverEmail: true,
        receiverCity: true,
        receiverState: true,
        receiverAddress1: true,
        receiverAddress2: true,
        receiverCountry: true,
        receiverZipCode: true,
        detailDescription: true,
        declaredWeight: true,
        dimensionText: true,
        dimensionLength: true,
        dimensionWidth: true,
        dimensionHeight: true,
        declaredValue: true,
        packagingCode: true,
        actualWeight: true,
        volumeWeight: true,
        chargeableWeight: true,
        ecomTrackingNumber: true,
        baseShippingFee: true,
        surchargeFee: true,
        totalFee: true,
        createdAt: true,
        updatedAt: true,

        feeItems: {
          select: {
            id: true,
            feeType: true,
            name: true,
            amount: true,
            currency: true,
            createdAt: true,
          },
        },
        products: {
          select: {
            id: true,
            description: true,
            quantity: true,
            value: true,
            hsCode: true,
            originCountry: true,
            weight: true,
            sku: true,
          },
        },
        trackingCheckpoints: {
          select: {
            id: true,
            checkpointDate: true,
            location: true,
            description: true,
            carrierCode: true,
          },
          orderBy: { checkpointDate: "desc" },
        },
      },
    });
  }
}
