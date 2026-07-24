import type { OrderStatus } from "@ecom/prisma";
import { ShippingMethod } from "@customer/app/orders/constants/enums";

export const GetOrderStatusTxt = (status: OrderStatus): string => {
  switch (status) {
    case "LABEL_CREATED":
      return "Label Created";
    case "PENDING_LABEL":
      return "Pending Label";
    case "PACKAGE_RECEIVED":
      return "Package Received";
    case "ON_THE_WAY":
      return "On the Way";
    case "PICK_UP":
      return "Pick Up";
    case "DELIVERY":
      return "Delivery";
    default:
      return "";
  }
};

export const GetOrderStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case "LABEL_CREATED":
      return "#0042D0";
    case "PENDING_LABEL":
      return "#D32D20";
    case "PACKAGE_RECEIVED":
      return "#474747";
    case "ON_THE_WAY":
      return "#0F798C";
    case "PICK_UP":
      return "#C28108";
    case "DELIVERY":
      return "#22843A";
    default:
      return "";
  }
};

export const GetOrderStatusBackground = (status: OrderStatus): string => {
  switch (status) {
    case "LABEL_CREATED":
      return "#F2F7FF";
    case "PENDING_LABEL":
      return "#FBCFCE";
    case "PACKAGE_RECEIVED":
      return "#E9E9E9";
    case "ON_THE_WAY":
      return "#CFFEF9";
    case "PICK_UP":
      return "#FFF6EA";
    case "DELIVERY":
      return "#EBFAEF";
    default:
      return "";
  }
};

export const GetShippingMethodTxt = (method: ShippingMethod): string => {
  switch (method) {
    case ShippingMethod.EPACKET:
      return "ePacket";
    case ShippingMethod.EXPRESS:
      return "Express";
    default:
      return "";
  }
};
