import {
  GetOrderStatusBackground,
  GetOrderStatusColor,
  GetOrderStatusTxt,
} from "@customer/app/orders/constants/constants";
import type { OrderStatus } from "@customer/app/orders/constants/enums";

interface TagOrderStatusProps {
  status: OrderStatus;
}

export default function TagOrderStatus({ status }: TagOrderStatusProps) {
  return (
    <div
      className="tag-order-status text-sm 2xl:text-base w-fit px-2 py-1 rounded-xl"
      style={{
        color: GetOrderStatusColor(status),
        backgroundColor: GetOrderStatusBackground(status),
      }}
    >
      {GetOrderStatusTxt(status)}
    </div>
  );
}
