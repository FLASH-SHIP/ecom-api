import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { ApiBulkItemResult, ApiBulkResponse, ApiErrorDetail } from "./api-response";

export interface ExecuteBatchOptions {
  maxLimit?: number;
}

/**
 * Standard batch processor utility for bulk API endpoints.
 * Validates each item schema via class-validator and executes processor callback in isolation.
 */
export async function executeBatchProcess<
  TInput extends object,
  TOutput extends Record<string, any>,
>(
  items: TInput[],
  dtoClass: new () => object,
  processor: (item: TInput, index: number) => Promise<TOutput>,
  options?: ExecuteBatchOptions,
): Promise<ApiBulkResponse<TOutput>> {
  const maxLimit = options?.maxLimit ?? 50;
  if (!Array.isArray(items) || items.length === 0) {
    return {
      summary: { total: 0, succeeded: 0, failed: 0 },
      data: [],
    };
  }

  if (items.length > maxLimit) {
    throw new Error(
      `Kích thước danh sách vượt quá giới hạn tối đa ${maxLimit} phần tử per request.`,
    );
  }

  const results: ApiBulkItemResult<TOutput>[] = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;

    const dtoInstance = plainToInstance(dtoClass, item);
    const schemaErrors = await validate(dtoInstance);

    if (schemaErrors.length > 0) {
      failed++;
      const itemErrors: ApiErrorDetail[] = [];
      for (const err of schemaErrors) {
        if (err.constraints) {
          for (const [constraintName, msg] of Object.entries(err.constraints)) {
            const code = constraintName.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
            itemErrors.push({ code, field: err.property, message: msg });
          }
        }
      }
      results.push({
        index: i,
        success: false,
        errors: itemErrors,
      });
      continue;
    }

    try {
      const output = await processor(item, i);
      succeeded++;
      results.push({
        index: i,
        success: true,
        orderId: output?.id ?? output?.orderId,
        orderCode: output?.orderCode,
        data: output,
      });
    } catch (err) {
      failed++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      let field = "general";
      let code = "BUSINESS_ERROR";

      if (errorMsg.includes("sellerOrderId") || errorMsg.includes("Seller Order ID")) {
        field = "sellerOrderId";
        code = "DUPLICATE_SELLER_ORDER_ID";
      } else if (errorMsg.includes("bảng giá") || errorMsg.includes("RateCard")) {
        field = "shippingMethod";
        code = "RATE_CARD_NOT_FOUND";
      }

      results.push({
        index: i,
        success: false,
        errors: [{ code, field, message: errorMsg }],
      });
    }
  }

  return {
    summary: {
      total: items.length,
      succeeded,
      failed,
    },
    data: results,
  };
}
