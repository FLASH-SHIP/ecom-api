export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  // biome-ignore lint/suspicious/noExplicitAny: generic dynamic filters can hold any data types
  filter?: Record<string, any>;
  search?: string;
  searchFields?: string[];
}

export interface PrismaQueryArgs {
  // biome-ignore lint/suspicious/noExplicitAny: prisma where accepts dynamic criteria
  where: Record<string, any>;
  orderBy?: Record<string, "asc" | "desc">[];
  skip?: number;
  take?: number;
}

// biome-ignore lint/complexity/noStaticOnlyClass: class contains static methods for dynamic query building namespace grouping
export class PrismaQueryBuilder {
  /**
   * Build Prisma query arguments from generic QueryOptions.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: query builder maps multiple query params dynamically
  static build(options: QueryOptions): PrismaQueryArgs {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic where criteria
    const where: Record<string, any> = {};
    const result: PrismaQueryArgs = { where };

    // 1. Process Filters
    if (options.filter && typeof options.filter === "object") {
      for (const [key, value] of Object.entries(options.filter)) {
        if (value !== undefined && value !== null && value !== "") {
          // If value is an array, map to 'in' operator
          if (Array.isArray(value)) {
            where[key] = { in: value };
          } else if (typeof value === "object") {
            where[key] = value;
          } else {
            where[key] = value;
          }
        }
      }
    }

    // 2. Process Search
    if (options.search && options.searchFields && options.searchFields.length > 0) {
      const searchTerms = options.search.trim();
      if (searchTerms) {
        where.OR = options.searchFields.map((field) => ({
          [field]: {
            contains: searchTerms,
            mode: "insensitive",
          },
        }));
      }
    }

    // 3. Process Sorting
    if (options.sort) {
      const orderFields = options.sort.split(",").map((field) => field.trim());
      const orderBy: Record<string, "asc" | "desc">[] = [];

      for (const field of orderFields) {
        if (field.startsWith("-")) {
          orderBy.push({ [field.slice(1)]: "desc" });
        } else {
          orderBy.push({ [field]: "asc" });
        }
      }

      if (orderBy.length > 0) {
        result.orderBy = orderBy;
      }
    } else {
      // Default fallback sorting
      result.orderBy = [{ createdAt: "desc" }];
    }

    // 4. Process Pagination
    if (options.page !== undefined && options.limit !== undefined) {
      const page = Math.max(1, Number(options.page));
      const limit = Math.max(1, Number(options.limit));
      result.skip = (page - 1) * limit;
      result.take = limit;
    }

    return result;
  }
}
