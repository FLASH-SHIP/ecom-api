import type {
  ICarrierProvider,
  PriceInquiryDto,
} from "@ecom/features/integrations/carrier/interfaces/carrier-provider.interface";
import { PartnerProviderRegistry } from "@ecom/features/integrations/index";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminCarrierController } from "../admin-carrier.controller";

const mockPurchaseLabel = vi.fn();

vi.mock("@ecom/features/di/containers/OrderLabelService", () => ({
  getOrderLabelService: () => ({
    purchaseLabel: mockPurchaseLabel,
  }),
}));

describe("AdminCarrierController", () => {
  let controller: AdminCarrierController;
  let mockCarrier: ICarrierProvider & {
    getBalance: ReturnType<typeof vi.fn>;
    inquirePrice: ReturnType<typeof vi.fn>;
    createLabel: ReturnType<typeof vi.fn>;
    trackPackage: ReturnType<typeof vi.fn>;
    printLabel: ReturnType<typeof vi.fn>;
    voidLabel: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCarrier = {
      code: "EPICHUB",
      getCapabilities: () => ({
        supportsPriceInquiry: true,
        supportsAddressValidation: true,
        supportsVoid: true,
        supportsBalanceCheck: true,
        supportsReturnService: false,
      }),
      getBalance: vi.fn().mockResolvedValue({ balance: { monetaryValue: 500, currencyCode: "USD" } }),
      inquirePrice: vi.fn().mockResolvedValue([{ serviceCode: "03", totalCharges: { monetaryValue: 15.5, currencyCode: "USD" } }]),
      createLabel: vi.fn().mockResolvedValue({ isAmbiguous: false, shipmentIdentificationNumber: "1ZX123" }),
      trackPackage: vi.fn().mockResolvedValue({ trackingNumber: "1ZX123", currentStatus: { code: "DELIVERED", description: "Delivered" } }),
      printLabel: vi.fn().mockResolvedValue({ pdfBuffer: Buffer.from("PDF"), encodedLabel: "BASE64" }),
      voidLabel: vi.fn().mockResolvedValue({ voidedTrackingNumber: "1ZX123" }),
    };

    const registry = PartnerProviderRegistry.getInstance();
    registry.clear();
    registry.registerCarrier(mockCarrier);

    controller = new AdminCarrierController();
  });

  it("should query EpicHub account balance", async () => {
    const res = await controller.getBalance();
    expect(mockCarrier.getBalance).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ balance: { monetaryValue: 500, currencyCode: "USD" } });
  });

  it("should calculate freight price inquiry", async () => {
    const dto = { requestId: "req_1", serviceCode: "03" } as PriceInquiryDto;
    const res = await controller.inquirePrice(dto);
    expect(mockCarrier.inquirePrice).toHaveBeenCalledWith(dto);
    expect(res).toEqual([{ serviceCode: "03", totalCharges: { monetaryValue: 15.5, currencyCode: "USD" } }]);
  });

  it("should track package status by tracking number", async () => {
    const res = await controller.trackPackage("1ZX123");
    expect(mockCarrier.trackPackage).toHaveBeenCalledWith("1ZX123");
    expect(res.trackingNumber).toBe("1ZX123");
  });

  it("should print label PDF by tracking number", async () => {
    const res = await controller.printLabel({ trackingNumber: "1ZX123" });
    expect(mockCarrier.printLabel).toHaveBeenCalledWith({ trackingNumber: "1ZX123", requestId: undefined, encoded: true });
    expect(res.encodedLabel).toBe("BASE64");
  });

  it("should void label by tracking number", async () => {
    const res = await controller.voidLabel({ trackingNumber: "1ZX123" });
    expect(mockCarrier.voidLabel).toHaveBeenCalledWith("1ZX123");
    expect(res.voidedTrackingNumber).toBe("1ZX123");
  });

  it("should admin purchase order label with operatorId='admin'", async () => {
    mockPurchaseLabel.mockResolvedValue({ id: "ord_1", status: "LABEL_CREATED" });
    const res = (await controller.adminPurchaseOrderLabel("ord_1")) as { id: string; status: string };
    expect(mockPurchaseLabel).toHaveBeenCalledWith({ orderId: "ord_1", operatorId: "admin" });
    expect(res.status).toBe("LABEL_CREATED");
  });
});
