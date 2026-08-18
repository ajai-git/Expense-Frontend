
import { apiRequest } from './api';
import { ExpenseCategory } from '../types';

export interface CreateCategoryPayload {
 // code: string;
  name: string;
  description?: string;
  approval_required?: boolean;
  receipt_required?: boolean;
  receipt_required_above_amount?: number;
  daily_limit_amount?: number | null;
  monthly_limit_amount?: number | null;
  color?: string;
  active?: boolean;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

const BASE = '/api/v1/masters/categories';

export const categoriesApi = {
  /** GET /masters/categories?active_only= */
  async list(activeOnly = false): Promise<ExpenseCategory[]> {
    return apiRequest<ExpenseCategory[]>(`${BASE}?active_only=${activeOnly}`, {
      method: 'GET',
    });
  },

  /** GET /masters/categories/{id} */
  async getById(id: string): Promise<ExpenseCategory> {
    return apiRequest<ExpenseCategory>(`${BASE}/${id}`, { method: 'GET' });
  },

  /** POST /masters/categories */
  async create(payload: CreateCategoryPayload): Promise<ExpenseCategory> {
    return apiRequest<ExpenseCategory>(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** PATCH /masters/categories/{id} */
  async update(id: string, payload: UpdateCategoryPayload): Promise<ExpenseCategory> {
    return apiRequest<ExpenseCategory>(`${BASE}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /** DELETE /masters/categories/{id} (soft delete, admin only per router) */
  async remove(id: string): Promise<void> {
    await apiRequest<unknown>(`${BASE}/${id}`, { method: 'DELETE' });
  },
};