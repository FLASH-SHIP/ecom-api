export abstract class BaseTransformer<T, R> {
  abstract transform(item: T): R;

  transformItem(item: T): R {
    return this.transform(item);
  }

  transformCollection(items: T[]): R[] {
    return items.map((item) => this.transform(item));
  }

  transformPaginated<M extends { total: number; page: number; perPage: number }>(paginated: {
    data: T[];
    meta: M;
  }): { data: R[]; meta: M } {
    return {
      data: this.transformCollection(paginated.data),
      meta: paginated.meta,
    };
  }
}
