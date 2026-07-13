import { getRateCardService } from "@ecom/features/di/containers/ShippingRateService";
import { OrderRepository } from "@ecom/features/order/repositories/OrderRepository";
import { OrderService } from "@ecom/features/order/services/OrderService";
import { prisma } from "@ecom/prisma";

let _orderRepository: OrderRepository | null = null;
let _orderService: OrderService | null = null;

export function getOrderRepository(): OrderRepository {
  if (!_orderRepository) {
    _orderRepository = new OrderRepository(prisma);
  }
  return _orderRepository;
}

export function getOrderService(): OrderService {
  if (!_orderService) {
    _orderService = new OrderService({
      orderRepo: getOrderRepository(),
      rateCardService: getRateCardService(),
    });
  }
  return _orderService;
}

export function resetOrderService(): void {
  _orderRepository = null;
  _orderService = null;
}
