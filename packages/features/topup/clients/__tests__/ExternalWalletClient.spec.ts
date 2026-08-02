import { generateWalletSignature } from "../ExternalWalletClient";
import {
  EXTERNAL_WALLET_FROM_SYSTEM,
  EXTERNAL_WALLET_PAYMENT_TYPE,
  ExternalWalletActionType,
} from "../../dtos/externalWalletDTOs";

describe("ExternalWalletClient Signature Verification", () => {
  const secretKey = "test_external_wallet_secret_key_123456";

  it("should generate a 64-character lowercase hex HMAC-SHA256 signature", () => {
    const rawBody = JSON.stringify({
      partnerId: 145,
      partnerCode: "POD001",
    });

    const timestamp = "1785315722138";
    const signature = generateWalletSignature(rawBody, secretKey, timestamp);

    expect(signature).toBeDefined();
    expect(signature.length).toBe(64);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it("should generate deterministic signature for identical rawBody, secretKey, and timestamp", () => {
    const rawBody = JSON.stringify({
      fromSystem: EXTERNAL_WALLET_FROM_SYSTEM,
      buyerInfo: { partnerId: 145, partnerCode: "POD001" },
      orderItem: {
        actionType: ExternalWalletActionType.DECREASE,
        paymentType: EXTERNAL_WALLET_PAYMENT_TYPE,
        price: 50000,
        note: "Charge for order #12345",
        orderCode: "ORD-12345",
      },
    });

    const timestamp = "1785315722138";
    const sig1 = generateWalletSignature(rawBody, secretKey, timestamp);
    const sig2 = generateWalletSignature(rawBody, secretKey, timestamp);

    expect(sig1).toBe(sig2);
  });

  it("should throw error if secretKey is empty", () => {
    expect(() => generateWalletSignature("{}", "", "12345")).toThrow(
      "Payment signature secret is not configured",
    );
  });
});
