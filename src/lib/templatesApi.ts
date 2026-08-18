import { api } from './api';
import { ExpenseTemplate, ExpenseTemplateRow } from '../types';


// Confirmed via Swagger: router is mounted at /api/v1 + router's own /masters prefix
const BASE_PATH = '/api/v1/masters/templates';

export interface CreateTemplatePayload {
  template_code: string;
  template_name: string;
  active?: boolean;
  cost_center_ids?: string[];
}

export interface UpdateTemplatePayload {
  template_code?: string;
  template_name?: string;
  active?: boolean;
  cost_center_ids?: string[];
  is_deleted?: boolean;
}

export interface CreateTemplateRowPayload {
  expense_name_id: string;
  category_id: string;
  default_amount: number;
  employee_required?: boolean;
  remarks?: string;
  sequence: number;
}

export type UpdateTemplateRowPayload = Partial<CreateTemplateRowPayload>;

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const templatesApi = {
  list(activeOnly = false): Promise<ExpenseTemplate[]> {
    const query = buildQuery({ active_only: activeOnly });
    return api.get<ExpenseTemplate[]>(`${BASE_PATH}${query}`);
  },

  getById(id: string): Promise<ExpenseTemplate> {
    return api.get<ExpenseTemplate>(`${BASE_PATH}/${id}`);
  },

  create(payload: CreateTemplatePayload): Promise<ExpenseTemplate> {
    return api.post<ExpenseTemplate>(BASE_PATH, payload);
  },

  update(id: string, payload: UpdateTemplatePayload): Promise<ExpenseTemplate> {
    return api.patch<ExpenseTemplate>(`${BASE_PATH}/${id}`, payload);
  },

  softDelete(id: string): Promise<ExpenseTemplate> {
    return api.patch<ExpenseTemplate>(`${BASE_PATH}/${id}`, { is_deleted: true });
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(`${BASE_PATH}/${id}`);
  },

  addRow(templateId: string, payload: CreateTemplateRowPayload): Promise<ExpenseTemplateRow> {
    return api.post<ExpenseTemplateRow>(`${BASE_PATH}/${templateId}/rows`, payload);
  },

  updateRow(
    templateId: string,
    rowId: string,
    payload: UpdateTemplateRowPayload
  ): Promise<ExpenseTemplateRow> {
    return api.patch<ExpenseTemplateRow>(`${BASE_PATH}/${templateId}/rows/${rowId}`, payload);
  },

  removeRow(templateId: string, rowId: string): Promise<void> {
    return api.delete<void>(`${BASE_PATH}/${templateId}/rows/${rowId}`);
  },
};