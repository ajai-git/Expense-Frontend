
import { apiRequest } from './api';
import { ExpenseName } from '../types';

export interface CreateExpenseNamePayload {
  category_id: string;
 // code: string;
  name: string;
  default_amount?: number;
  default_remarks?: string;
  employee_required?: boolean;
  allow_multiple_employees?: boolean;
  driver_required?: boolean;
  vehicle_required?: boolean;
  route_required?: boolean;
  receipt_required?: boolean;
  approval_required?: boolean;
  active?: boolean;
}

export type UpdateExpenseNamePayload = Partial<Omit<CreateExpenseNamePayload, 'category_id'>>;

const BASE = '/api/v1/masters/expense-names';

export const expenseNamesApi = {
  async list(categoryId?: string, activeOnly = false): Promise<ExpenseName[]> {
    const params = new URLSearchParams({ active_only: String(activeOnly) });

    if (categoryId) {
      params.set('category_id', categoryId);
    }

    return apiRequest<ExpenseName[]>(`${BASE}?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getById(id: string): Promise<ExpenseName> {
    return apiRequest<ExpenseName>(`${BASE}/${id}`, {
      method: 'GET',
    });
  },

  async create(payload: CreateExpenseNamePayload): Promise<ExpenseName> {
    return apiRequest<ExpenseName>(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(
    id: string,
    payload: UpdateExpenseNamePayload
  ): Promise<ExpenseName> {
    return apiRequest<ExpenseName>(`${BASE}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(
    id: string,
    active: boolean
  ): Promise<ExpenseName> {
    return apiRequest<ExpenseName>(`${BASE}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
  },
};