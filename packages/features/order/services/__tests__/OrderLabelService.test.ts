import type { LocalStorageAdapter } from "@ecom/features/media/storage/LocalStorageAdapter";
import type { TopupTransactionRepository } from "@ecom/features/topup/repositories/TopupTransactionRepository";
import { LabelStatus, OrderStatus } from "@ecom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ICarrierProvider } from "../../../integrations";
import { EPICHUB_DEFAULT_SERVICE_CODE, EPICHUB_SHIP_FROM_ADDRESSES, PartnerProviderRegistry } from "../../../integrations";
import type { OrderRepository } from "../../repositories/OrderRepository";
import { OrderLabelService } from "../OrderLabelService";

vi.mock("@ecom/prisma", async () => {
  const actual = await vi.importActual("@ecom/prisma");
  const { EPICHUB_DEFAULT_SERVICE_CODE } = await import("../../../integrations");
  return {
    ...actual,
    runInTransaction: vi.fn(async (cb) => cb()),
    prisma: {
      partner: {
        findUnique: vi.fn().mockResolvedValue({ id: 1, code: "EPICHUB" }),
        findFirst: vi.fn().mockResolvedValue({ id: 1, code: "EPICHUB" }),
      },
      partnerService: {
        findFirst: vi.fn().mockResolvedValue({ id: 10, code: EPICHUB_DEFAULT_SERVICE_CODE }),
      },
      partnerAuditLog: {
        create: vi.fn().mockResolvedValue({ id: 100 }),
      },
    },
  };
});

describe("OrderLabelService", () => {
  let mockOrderRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockTopupRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockStorage: Record<string, ReturnType<typeof vi.fn>>;
  let mockCarrier: Record<string, unknown>;
  let labelService: OrderLabelService;

  const sampleOrder = {
    id: "ord_123",
    orderCode: "EC26080312345678",
    customerId: "cust_1",
    status: OrderStatus.PENDING_LABEL,
    labelStatus: LabelStatus.PENDING_LABEL,
    shippingMethod: "EPACKET",
    shippingOrigin: "HAN",
    carrierCode: "EPICHUB",
    declaredWeight: 500,
    dimensionLength: 20,
    dimensionWidth: 15,
    dimensionHeight: 10,
    receiverName: "John Buyer",
    receiverPhone: "123456789",
    receiverEmail: "buyer@example.com",
    receiverAddress1: "123 Main St",
    receiverCity: "New York",
    receiverState: "NY",
    receiverZipCode: "10001",
    receiverCountry: "US",
    detailDescription: "Gift item",
    totalFee: 15.5,
    products: [
      { description: "Item 1", quantity: 1, value: 20, weight: 500 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockOrderRepo = {
      findById: vi.fn().mockResolvedValue({ ...sampleOrder }),
      update: vi.fn().mockImplementation((_id, data) =>
        Promise.resolve({ ...sampleOrder, ...data })
      ),
      createActivityLog: vi.fn().mockResolvedValue({ id: 1 }),
    };

    mockTopupRepo = {
      getWalletBalance: vi.fn().mockResolvedValue(100.0),
      payOrderWithWallet: vi.fn().mockResolvedValue({ id: 1 }),
      refundOrderWithWallet: vi.fn().mockResolvedValue({ id: 2 }),
    };

    mockStorage = {
      upload: vi.fn().mockResolvedValue("/uploads/labels/EC26080312345678_1ZX123.pdf"),
    };

    mockCarrier = {
      code: "EPICHUB",
      getCapabilities: vi.fn().mockReturnValue({ supportsVoid: true }),
      createLabel: vi.fn().mockResolvedValue({
        isAmbiguous: false,
        requestId: "EC26080312345678",
        serviceCode: EPICHUB_DEFAULT_SERVICE_CODE,
        shipmentIdentificationNumber: "1ZX1234567890",
        totalCharges: { monetaryValue: 15.5, currencyCode: "USD" },
        totalBillingWeight: { weight: 1.1, unitOfMeasurement: "LBS" },
        packageResults: [
          {
            sequence: 1,
            trackingNumber: "1ZX1234567890",
            billingWeight: { weight: 1.1, unitOfMeasurement: "LBS" },
            charge: { monetaryValue: 15.5, currencyCode: "USD" },
          },
        ],
      }),
      printLabel: vi.fn().mockImplementation(async (params) => {
        if (params?.trackingNumber) {
          return {
            pdfBuffer: Buffer.from("PDF_BYTES_MOCK"),
            encodedLabel: "UERGX0JZVEVTX01PQ0s=",
          };
        }
        return { pdfBuffer: undefined, encodedLabel: undefined };
      }),
    };

    const registry = PartnerProviderRegistry.getInstance();
    registry.clear();
    registry.registerCarrier(mockCarrier as unknown as ICarrierProvider);

    labelService = new OrderLabelService({
      orderRepo: mockOrderRepo as unknown as OrderRepository,
      topupRepo: mockTopupRepo as unknown as TopupTransactionRepository,
      storage: mockStorage as unknown as LocalStorageAdapter,
    });
  });

  it("should successfully purchase a label via EpicHub with independent US ShipFrom address", async () => {
    const result = (await labelService.purchaseLabel({
      orderId: "ord_123",
      customerId: "cust_1",
    })) as Record<string, unknown>;

    expect(mockOrderRepo.findById).toHaveBeenCalledWith("ord_123");
    expect((mockCarrier.createLabel as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);

    const createDto = (mockCarrier.createLabel as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createDto.serviceCode).toBe(EPICHUB_DEFAULT_SERVICE_CODE);
    // Verify 100% independent US ShipFrom (HAN -> California address)
    expect(createDto.shipFrom.addressLine1).toBe(EPICHUB_SHIP_FROM_ADDRESSES.HAN.Address.AddressLine1);
    expect(createDto.shipFrom.stateProvinceCode).toBe("CA");

    expect(mockStorage.upload).toHaveBeenCalledTimes(1);
    expect(mockOrderRepo.update).toHaveBeenCalledWith("ord_123", expect.objectContaining({
      trackingNumber: "1ZX1234567890",
      carrierCode: "EPICHUB",
      labelUrl: "/uploads/labels/EC26080312345678_1ZX123.pdf",
      status: OrderStatus.LABEL_CREATED,
      labelStatus: LabelStatus.SUCCESS,
    }));

    expect(result.trackingNumber).toBe("1ZX1234567890");
  });

  it("should use New Jersey ShipFrom address when shippingOrigin is SGN", async () => {
    mockOrderRepo.findById.mockResolvedValue({
      ...sampleOrder,
      shippingOrigin: "SGN",
    });

    await labelService.purchaseLabel({
      orderId: "ord_123",
      customerId: "cust_1",
    });

    const createDto = (mockCarrier.createLabel as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createDto.shipFrom.addressLine1).toBe(EPICHUB_SHIP_FROM_ADDRESSES.SGN.Address.AddressLine1);
    expect(createDto.shipFrom.stateProvinceCode).toBe("NJ");
  });

  it("should return early if label already exists and is saved (Idempotent)", async () => {
    mockOrderRepo.findById.mockResolvedValue({
      ...sampleOrder,
      trackingNumber: "1ZX999",
      labelUrl: "/uploads/labels/existing.pdf",
      status: OrderStatus.LABEL_CREATED,
    });

    const result = (await labelService.purchaseLabel({
      orderId: "ord_123",
      customerId: "cust_1",
    })) as Record<string, unknown>;

    expect((mockCarrier.createLabel as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect(result.trackingNumber).toBe("1ZX999");
  });

  it("should handle 202 Address Ambiguous response from carrier", async () => {
    (mockCarrier.createLabel as ReturnType<typeof vi.fn>).mockResolvedValue({
      isAmbiguous: true,
      message: "Address is ambiguous",
      candidates: {
        shipFrom: [],
        shipTo: [{ addressLine1: "123 Main St Ste A", city: "New York", stateCode: "NY", postalCode: "10001", countryCode: "US" }],
      },
    });

    const result = (await labelService.purchaseLabel({
      orderId: "ord_123",
      customerId: "cust_1",
    })) as Record<string, unknown>;

    expect(result.isAmbiguous).toBe(true);
    expect((result.candidates as { shipTo: unknown[] }).shipTo.length).toBe(1);
    expect(mockStorage.upload).not.toHaveBeenCalled();
  });

  it("should void label successfully and delete local PDF file", async () => {
    mockOrderRepo.findById.mockResolvedValue({
      ...sampleOrder,
      trackingNumber: "1ZX2402221150301923678045",
      labelUrl: "/uploads/2026/08/labels/123-EC123.pdf",
      status: OrderStatus.LABEL_CREATED,
    });
    mockCarrier.voidLabel = vi.fn().mockResolvedValue({ voidedTrackingNumber: "1ZX2402221150301923678045" });
    mockStorage.delete = vi.fn().mockResolvedValue(undefined);

    await labelService.voidLabel({
      orderId: "ord_123",
      operatorId: "admin@example.com",
    });

    expect(mockCarrier.voidLabel).toHaveBeenCalledWith("1ZX2402221150301923678045");
    expect(mockStorage.delete).toHaveBeenCalledWith("/uploads/2026/08/labels/123-EC123.pdf");
    expect(mockOrderRepo.update).toHaveBeenCalledWith("ord_123", expect.objectContaining({
      trackingNumber: null,
      labelUrl: null,
      status: OrderStatus.PENDING_LABEL,
      labelStatus: LabelStatus.CANCELLED,
      isGetLabel: 0,
    }));
  });

  it("should throw error if order has no tracking number or labelUrl on voidLabel", async () => {
    mockOrderRepo.findById.mockResolvedValue({
      ...sampleOrder,
      trackingNumber: null,
      labelUrl: null,
      status: OrderStatus.PENDING_LABEL,
    });

    await expect(
      labelService.voidLabel({
        orderId: "ord_123",
        operatorId: "admin@example.com",
      })
    ).rejects.toThrow("Đơn hàng chưa có mã vận đơn hoặc chưa được mua nhãn tem");
  });

  it("should throw error if customer wallet balance is insufficient on purchaseLabel", async () => {
    mockTopupRepo.getWalletBalance.mockResolvedValue(5.0); // balance 5.0 < fee 15.5

    await expect(
      labelService.purchaseLabel({
        orderId: "ord_123",
        customerId: "cust_1",
      })
    ).rejects.toThrow("Số dư ví khả dụng (5.00$) không đủ để mua label");

    expect(mockCarrier.createLabel as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it("should call payOrderWithWallet on successful purchaseLabel", async () => {
    await labelService.purchaseLabel({
      orderId: "ord_123",
      customerId: "cust_1",
    });

    expect(mockTopupRepo.payOrderWithWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "ord_123",
        amount: 15.5,
        customerId: "cust_1",
      })
    );
  });

  it("should call refundOrderWithWallet on voidLabel", async () => {
    mockOrderRepo.findById.mockResolvedValue({
      ...sampleOrder,
      trackingNumber: "1ZX2402221150301923678045",
      labelUrl: "/uploads/2026/08/labels/123-EC123.pdf",
      status: OrderStatus.LABEL_CREATED,
    });
    mockCarrier.voidLabel = vi.fn().mockResolvedValue({ voidedTrackingNumber: "1ZX2402221150301923678045", voidFeePercent: 10 });
    mockStorage.delete = vi.fn().mockResolvedValue(undefined);

    await labelService.voidLabel({
      orderId: "ord_123",
      operatorId: "admin@example.com",
    });

    expect(mockTopupRepo.refundOrderWithWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "ord_123",
        amount: 13.95, // 15.5 * (1 - 0.1) = 13.95
        customerId: "cust_1",
      })
    );
  });

  it("should complete purchaseLabel and log PAYMENT_FAILED_RECONCILE if payOrderWithWallet fails", async () => {
    mockTopupRepo.payOrderWithWallet.mockRejectedValue(new Error("Wallet API Timeout 504"));

    const result = (await labelService.purchaseLabel({
      orderId: "ord_123",
      customerId: "cust_1",
    })) as Record<string, unknown>;

    expect(result.trackingNumber).toBe("1ZX1234567890");
    expect(mockOrderRepo.createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PAYMENT_FAILED_RECONCILE",
      })
    );
  });

  it("should log FEE_DISCREPANCY when actualFee is greater than order.totalFee", async () => {
    (mockCarrier.createLabel as ReturnType<typeof vi.fn>).mockResolvedValue({
      isAmbiguous: false,
      requestId: "EC26080312345678",
      serviceCode: EPICHUB_DEFAULT_SERVICE_CODE,
      shipmentIdentificationNumber: "1ZX1234567890",
      totalCharges: { monetaryValue: 20.0, currencyCode: "USD" }, // actualFee 20.0 > totalFee 15.5
      packageResults: [{ sequence: 1, trackingNumber: "1ZX1234567890", charge: { monetaryValue: 20.0, currencyCode: "USD" } }],
    });

    await labelService.purchaseLabel({
      orderId: "ord_123",
      customerId: "cust_1",
    });

    expect(mockOrderRepo.createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "FEE_DISCREPANCY",
      })
    );
  });

  it("should successfully reconcile pending label payment via reconcilePendingLabelPayment", async () => {
    mockTopupRepo.getWalletBalance.mockResolvedValue(100.0);
    mockTopupRepo.payOrderWithWallet.mockResolvedValue({ id: "tx_999" });

    const res = await labelService.reconcilePendingLabelPayment({
      orderId: "ord_123",
      actorId: "admin",
      actorType: "OPERATOR",
    });

    expect(res.success).toBe(true);
    expect(res.feeDeducted).toBe(15.5);
    expect(mockTopupRepo.payOrderWithWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "ord_123",
        amount: 15.5,
        customerId: "cust_1",
      })
    );
    expect(mockOrderRepo.createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "RECONCILE_SUCCESS",
        actorType: "OPERATOR",
      })
    );
  });
});
