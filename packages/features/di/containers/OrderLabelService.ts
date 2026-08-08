import { OrderLabelService } from "@ecom/features/order/services/OrderLabelService";
import { TopupTransactionRepository } from "@ecom/features/topup/repositories/TopupTransactionRepository";
import { prisma } from "@ecom/prisma";
import { getOrderRepository } from "./OrderService";

let _orderLabelService: OrderLabelService | null = null;

export function getOrderLabelService(): OrderLabelService {
  if (!_orderLabelService) {
    _orderLabelService = new OrderLabelService({
      orderRepo: getOrderRepository(),
      topupRepo: new TopupTransactionRepository(prisma),
    });
  }
  return _orderLabelService;
}

export function setOrderLabelService(service: OrderLabelService): void {
  _orderLabelService = service;
}

export function resetOrderLabelService(): void {
  _orderLabelService = null;
}
