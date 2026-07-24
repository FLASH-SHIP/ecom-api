import { OrderStatus, ShippingMethod } from "@customer/app/orders/constants/enums";

export const GetOrderStatusTxt = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.LABEL_CREATED:
      return "Label Created";
    case OrderStatus.PENDING_LABEL:
      return "Pending Label";
    case OrderStatus.PACKAGE_RECEIVED:
      return "Package Received";
    case OrderStatus.ON_THE_WAY:
      return "On the Way";
    case OrderStatus.PICK_UP:
      return "Pick Up";
    case OrderStatus.DELIVERY:
      return "Delivery";
    default:
      return "";
  }
};

export const GetOrderStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.LABEL_CREATED:
      return "#0042D0";
    case OrderStatus.PENDING_LABEL:
      return "#D32D20";
    case OrderStatus.PACKAGE_RECEIVED:
      return "#474747";
    case OrderStatus.ON_THE_WAY:
      return "#0F798C";
    case OrderStatus.PICK_UP:
      return "#C28108";
    case OrderStatus.DELIVERY:
      return "#22843A";
    default:
      return "";
  }
};

export const GetOrderStatusBackground = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.LABEL_CREATED:
      return "#F2F7FF";
    case OrderStatus.PENDING_LABEL:
      return "#FBCFCE";
    case OrderStatus.PACKAGE_RECEIVED:
      return "#E9E9E9";
    case OrderStatus.ON_THE_WAY:
      return "#CFFEF9";
    case OrderStatus.PICK_UP:
      return "#FFF6EA";
    case OrderStatus.DELIVERY:
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

export interface OrderStatusOption {
  value: OrderStatus;
  label: string;
}

export const getOrderStatusOptions = (): OrderStatusOption[] => {
  return Object.values(OrderStatus).map((status) => ({
    value: status,
    label: GetOrderStatusTxt(status),
  }));
};

export interface ShippingMethodOption {
  value: ShippingMethod;
  label: string;
}

export const getShippingMethodOptions = (): ShippingMethodOption[] => {
  return Object.values(ShippingMethod).map((method) => ({
    value: method,
    label: GetShippingMethodTxt(method),
  }));
};
