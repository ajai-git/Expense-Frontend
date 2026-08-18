import { apiRequest } from './api';

type ApiResult<T> = { data: T | null; error: { message: string } | null };
type FilterOp = 'eq' | 'neq' | 'in' | 'gte' | 'lte';
type Filter = { op: FilterOp; field: string; value: unknown };
type Order = { field: string; ascending: boolean };

function normalizeTable(table: string) {
  return table;
}

class FastApiQuery<T = unknown> implements PromiseLike<ApiResult<T>> {
  private selectValue = '*';
  private filters: Filter[] = [];
  private orderBy?: Order;
  private rowLimit?: number;
  private singleMode: 'none' | 'single' | 'maybeSingle' = 'none';
  private mutation?: { type: 'insert' | 'update' | 'delete'; payload?: Record<string, unknown> };

  constructor(private tableName: string) {}

  select(value = '*') { this.selectValue = value; return this; }
  eq(field: string, value: unknown) { this.filters.push({ op: 'eq', field, value }); return this; }
  neq(field: string, value: unknown) { this.filters.push({ op: 'neq', field, value }); return this; }
  in(field: string, value: unknown[]) { this.filters.push({ op: 'in', field, value }); return this; }
  gte(field: string, value: unknown) { this.filters.push({ op: 'gte', field, value }); return this; }
  lte(field: string, value: unknown) { this.filters.push({ op: 'lte', field, value }); return this; }
  order(field: string, opts?: { ascending?: boolean }) { this.orderBy = { field, ascending: opts?.ascending ?? true }; return this; }
  limit(n: number) { this.rowLimit = n; return this; }
  single() { this.singleMode = 'single'; this.rowLimit = 1; return this; }
  maybeSingle() { this.singleMode = 'maybeSingle'; this.rowLimit = 1; return this; }

  insert(payload: Record<string, unknown>) { this.mutation = { type: 'insert', payload }; return this; }
  update(payload: Record<string, unknown>) { this.mutation = { type: 'update', payload }; return this; }
  delete() { this.mutation = { type: 'delete' }; return this; }

  private async execute(): Promise<ApiResult<T>> {
    try {
      const table = normalizeTable(this.tableName);
      let data: unknown;

      if (this.mutation?.type === 'insert') {
        data = await apiRequest(`/db/${table}`, {
          method: 'POST',
          body: JSON.stringify(this.mutation.payload),
        });
      } else if (this.mutation?.type === 'update') {
        data = await apiRequest(`/db/${table}/update`, {
          method: 'PATCH',
          body: JSON.stringify({ filters: this.filters, payload: this.mutation.payload }),
        });
      } else if (this.mutation?.type === 'delete') {
        data = await apiRequest(`/db/${table}/delete`, {
          method: 'POST',
          body: JSON.stringify({ filters: this.filters }),
        });
      } else {
        data = await apiRequest(`/db/${table}/query`, {
          method: 'POST',
          body: JSON.stringify({
            select: this.selectValue,
            filters: this.filters,
            order: this.orderBy,
            limit: this.rowLimit,
          }),
        });
      }

      if (this.singleMode !== 'none' && Array.isArray(data)) {
        if (data.length === 0) return { data: null as T, error: null };
        data = data[0];
      }
      return { data: data as T, error: null };
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'FastAPI request failed';
      return { data: null, error: { message: error } };
    }
  }

  then<TResult1 = ApiResult<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const mongoDb = {
  from<T = unknown>(table: string) {
    return new FastApiQuery<T>(table);
  },
};