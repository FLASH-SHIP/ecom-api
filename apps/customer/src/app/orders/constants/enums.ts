export const OrderStatus = {
  LABEL_CREATED: "LABEL_CREATED",
  PENDING_LABEL: "PENDING_LABEL",
  PACKAGE_RECEIVED: "PACKAGE_RECEIVED",
  ON_THE_WAY: "ON_THE_WAY",
  PICK_UP: "PICK_UP",
  DELIVERY: "DELIVERY",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ShippingMethod = {
  EPACKET: "EPACKET",
  EXPRESS: "EXPRESS",
} as const;

export type ShippingMethod = (typeof ShippingMethod)[keyof typeof ShippingMethod];
