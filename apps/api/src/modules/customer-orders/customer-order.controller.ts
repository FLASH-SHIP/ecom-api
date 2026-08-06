import { getOrderService } from "@ecom/features/di/containers/OrderService";
import {
  mapToCustomerOrderDetailResponse,
  mapToEstimateFreightResponse,
} from "@ecom/features/order/mappers/CustomerOrderMapper";
import { OrderStatus } from "@ecom/prisma";
import { executeBatchProcess } from "@flash-ship/ecom-lib";
import { getRedisClient } from "@flash-ship/ecom-lib/redis";
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { ApiAuthGuard } from "../auth/api-auth.guard";
import {
  CreateBulkOrdersDto,
  CreateOrderDto,
  EstimateFreightDto,
  MAX_BULK_ORDER_LIMIT,
} from "./dto/create-order.dto.js";
import { CancelOrderDto, type GetCustomerOrdersDto } from "./dto/query-order.dto.js";
import {
  BulkOrdersBatchResponseDto,
  CustomerOrderDetailResponseDto,
  EstimateFreightResponseDto,
  PaginatedCustomerOrdersResponseDto,
} from "./dto/response-order.dto.js";

@ApiTags("Customer Orders")
@ApiBearerAuth()
@UseGuards(ApiAuthGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
@Controller({
  path: "customer/orders",
  version: "1",
})
export class CustomerOrderController {
  private validateCustomer(req: Request): string {
    const user = req.apiUser;
    if (user?.ownerType !== "Customer") {
      throw new ForbiddenException("Chỉ khách hàng mới có quyền thực hiện thao tác này qua API");
    }
    return user.id;
  }

  @Post("estimate-freight")
  @ApiOperation({ summary: "Estimate shipping freight before creating an order" })
  @ApiBody({ type: EstimateFreightDto })
  @ApiResponse({
    status: 200,
    description: "Freight calculation result",
    type: EstimateFreightResponseDto,
  })
  async estimateFreight(@Req() req: Request, @Body() body: EstimateFreightDto) {
    const customerId = this.validateCustomer(req);
    const result = await getOrderService().calculateOrderFreight({
      customerId,
      shippingMethod: body.shippingMethod,
      country: body.receiverCountry,
      declaredWeight: body.declaredWeight,
      dimensionLength: body.dimensionLength,
      dimensionWidth: body.dimensionWidth,
      dimensionHeight: body.dimensionHeight,
      origin: body.shippingOrigin,
    });
    return mapToEstimateFreightResponse(result);
  }

  @Post()
  @ApiOperation({ summary: "Create a single order with idempotency check" })
  @ApiBody({ type: CreateOrderDto })
  @ApiHeader({
    name: "X-Idempotency-Key",
    required: false,
    description: "Unique idempotency key to prevent duplicate order creation within 24 hours",
  })
  @ApiResponse({
    status: 201,
    description: "Order created successfully",
    type: CustomerOrderDetailResponseDto,
  })
  private async executeCreateOrder(
    customerId: string,
    body: CreateOrderDto,
    options?: { isBulk?: boolean },
  ) {
    const order = await getOrderService().createOrder({
      ...body,
      customerId,
    });

    if (body.isGetLabel === 1) {
      if (options?.isBulk) {
        try {
          const { queueBulkLabelPurchase } = await import(
            "@ecom/features/queue/workers/bulkLabelWorker"
          );
          await queueBulkLabelPurchase({
            orderId: order.id,
            customerId,
          });
        } catch (queueErr) {
          console.warn(
            `[CustomerOrderController] Queue label purchase dispatch failed for order #${order.orderCode}:`,
            queueErr,
          );
        }
      } else {
        try {
          const { getOrderLabelService } = await import(
            "@ecom/features/di/containers/OrderLabelService"
          );
          const updatedOrder = await getOrderLabelService().purchaseLabel({
            orderId: order.id,
            customerId,
          });
          if (updatedOrder && "id" in updatedOrder) {
            return mapToCustomerOrderDetailResponse(
              updatedOrder as Parameters<typeof mapToCustomerOrderDetailResponse>[0],
            );
          }
        } catch (labelErr) {
          console.warn(
            `[CustomerOrderController] Auto purchase label post-creation failed for order #${order.orderCode}:`,
            labelErr,
          );
        }
      }
    }

    return mapToCustomerOrderDetailResponse(
      order as Parameters<typeof mapToCustomerOrderDetailResponse>[0],
    );
  }

  @Post()
  @ApiOperation({ summary: "Create a single order with idempotency check" })
  @ApiBody({ type: CreateOrderDto })
  @ApiHeader({
    name: "X-Idempotency-Key",
    required: false,
    description: "Unique idempotency key to prevent duplicate order creation within 24 hours",
  })
  @ApiResponse({
    status: 201,
    description: "Order created successfully",
    type: CustomerOrderDetailResponseDto,
  })
  async createOrder(
    @Req() req: Request,
    @Body() body: CreateOrderDto,
    @Headers("X-Idempotency-Key") idempotencyKey?: string,
  ) {
    const customerId = this.validateCustomer(req);

    if (idempotencyKey) {
      const redis = getRedisClient();
      const cacheKey = `idempotency:customer:${customerId}:${idempotencyKey}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.warn("Redis idempotency read failed:", err);
      }

      const result = await this.executeCreateOrder(customerId, body);

      try {
        const redis = getRedisClient();
        await redis.set(cacheKey, JSON.stringify(result), "EX", 86400);
      } catch (err) {
        console.warn("Redis idempotency write failed:", err);
      }

      return result;
    }

    return this.executeCreateOrder(customerId, body);
  }

  @Post("bulk")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: "Bulk create orders (up to 50 orders per request) with idempotency check",
  })
  @ApiBody({ type: CreateBulkOrdersDto })
  @ApiHeader({
    name: "X-Idempotency-Key",
    required: false,
    description: "Unique idempotency key to prevent duplicate bulk order creation within 24 hours",
  })
  @ApiResponse({
    status: 201,
    description: "Bulk orders batch processing response with summary and item errors",
    type: BulkOrdersBatchResponseDto,
  })
  async createOrdersBulk(
    @Req() req: Request,
    @Body() body: CreateBulkOrdersDto,
    @Headers("X-Idempotency-Key") idempotencyKey?: string,
  ) {
    const customerId = this.validateCustomer(req);

    if (idempotencyKey) {
      const redis = getRedisClient();
      const cacheKey = `idempotency:customer:bulk:${customerId}:${idempotencyKey}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.warn("Redis bulk idempotency read failed:", err);
      }

      const result = await executeBatchProcess(
        body.orders,
        CreateOrderDto,
        async (orderData) => {
          return this.executeCreateOrder(customerId, orderData, { isBulk: true });
        },
        { maxLimit: MAX_BULK_ORDER_LIMIT },
      );

      try {
        await redis.set(cacheKey, JSON.stringify(result), "EX", 86400);
      } catch (err) {
        console.warn("Redis bulk idempotency write failed:", err);
      }

      return result;
    }

    return executeBatchProcess(
      body.orders,
      CreateOrderDto,
      async (orderData) => {
        return this.executeCreateOrder(customerId, orderData, { isBulk: true });
      },
      { maxLimit: MAX_BULK_ORDER_LIMIT },
    );
  }

  @Get()
  @ApiOperation({ summary: "List customer orders with pagination and filters" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "Page number (default 1)" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default 20, max 100)",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: OrderStatus,
    description: "Filter by order status",
  })
  @ApiQuery({
    name: "orderCode",
    required: false,
    type: String,
    description: "Filter by Ecom Order Code",
  })
  @ApiQuery({
    name: "sellerOrderId",
    required: false,
    type: String,
    description: "Filter by Seller Order ID",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search keyword matching orderCode, trackingNumber, sellerOrderId, receiverName",
  })
  @ApiQuery({
    name: "fromDate",
    required: false,
    type: String,
    description: "Start date filter (ISO String)",
  })
  @ApiQuery({
    name: "toDate",
    required: false,
    type: String,
    description: "End date filter (ISO String)",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list of customer orders",
    type: PaginatedCustomerOrdersResponseDto,
  })
  async getOrders(@Req() req: Request, @Query() query: GetCustomerOrdersDto) {
    const customerId = this.validateCustomer(req);
    return getOrderService().getCustomerOrders({
      customerId,
      page: query.page,
      perPage: query.limit,
      status: query.status,
      orderCode: query.orderCode,
      sellerOrderId: query.sellerOrderId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      search: query.search,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order details by orderId, orderCode, or sellerOrderId" })
  @ApiParam({ name: "id", description: "Order ID, Ecom Order Code, or Seller Order ID" })
  @ApiResponse({
    status: 200,
    description: "Order detailed response",
    type: CustomerOrderDetailResponseDto,
  })
  async getOrderDetail(@Req() req: Request, @Param("id") id: string) {
    const customerId = this.validateCustomer(req);
    return getOrderService().getCustomerOrderDetail(customerId, id);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Cancel an order (only if DRAFT or PENDING_LABEL)" })
  @ApiParam({ name: "id", description: "Order ID, Ecom Order Code, or Seller Order ID" })
  @ApiBody({ type: CancelOrderDto })
  @ApiResponse({ status: 200, description: "Order cancelled successfully" })
  async cancelOrder(@Req() req: Request, @Param("id") id: string, @Body() body: CancelOrderDto) {
    const customerId = this.validateCustomer(req);
    return getOrderService().cancelCustomerOrder(customerId, id, body.reason);
  }

  @Post(":id/purchase-label")
  @ApiOperation({ summary: "Purchase / Generate shipping label for an order" })
  @ApiParam({ name: "id", description: "Order ID, Ecom Order Code, or Seller Order ID" })
  @ApiResponse({
    status: 200,
    description: "Shipping label purchased successfully or address candidates returned",
  })
  async purchaseLabel(@Req() req: Request, @Param("id") id: string) {
    const customerId = this.validateCustomer(req);
    const { getOrderLabelService } = await import("@ecom/features/di/containers/OrderLabelService");
    return getOrderLabelService().purchaseLabel({
      orderId: id,
      customerId,
    });
  }
}
