import { api } from './api';
import { ExpenseTemplate, ExpenseTemplateRow } from '../types';

const BASE_PATH = '/api/v1/masters/templates';


// ==============================
// Employee Allocation
// ==============================

export interface EmployeeAllocationPayload {
  employee_id: string;
  amount: number;
}


// ==============================
// Template Payloads
// ==============================
export interface TemplateEmployeeAllocationPayload {
  employee_id: string;
  amount: number;
}

export interface TemplateRowPayload {
  expense_name_id: string;
  category_id: string;
  default_amount: number;
  employee_required: boolean;
  employee_allocations: TemplateEmployeeAllocationPayload[];
  remarks: string;
  sequence: number;
}

export interface CreateTemplatePayload {
  template_name: string;
  location_id: string;
  rows: TemplateRowPayload[];
  active?: boolean;
}

export interface UpdateTemplatePayload {
  template_name?: string;
  location_id?: string;
  active?: boolean;
  is_deleted?: boolean;
}


// ==============================
// Template Row Payloads
// ==============================

export interface CreateTemplateRowPayload {
  expense_name_id: string;
  category_id: string;

  /**
   * Total amount for the row.
   * Backend recalculates this from employee_allocations.
   */
  default_amount?: number;

  employee_required?: boolean;
  remarks?: string;
  sequence: number;

  /**
   * Multiple employees can be allocated
   * inside a single template row.
   */
  employee_allocations?: EmployeeAllocationPayload[];
}

export type UpdateTemplateRowPayload =
  Partial<CreateTemplateRowPayload>;


// ==============================
// Query Builder
// ==============================

function buildQuery(
  params: Record<string, string | number | boolean | undefined>
): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  });

  const qs = search.toString();

  return qs ? `?${qs}` : '';
}


// ==============================
// Templates API
// ==============================

export const templatesApi = {

  // Get all templates
  list(activeOnly = false): Promise<ExpenseTemplate[]> {
    const query = buildQuery({
      active_only: activeOnly,
    });

    return api.get<ExpenseTemplate[]>(
      `${BASE_PATH}${query}`
    );
  },


  // Get template by ID
  getById(id: string): Promise<ExpenseTemplate> {
    return api.get<ExpenseTemplate>(
      `${BASE_PATH}/${id}`
    );
  },


  // Create template
  create(
    payload: CreateTemplatePayload
  ): Promise<ExpenseTemplate> {
    return api.post<ExpenseTemplate>(
      BASE_PATH,
      payload
    );
  },


  // Update template
  update(
    id: string,
    payload: UpdateTemplatePayload
  ): Promise<ExpenseTemplate> {
    return api.patch<ExpenseTemplate>(
      `${BASE_PATH}/${id}`,
      payload
    );
  },


  // Soft delete template
  softDelete(id: string): Promise<ExpenseTemplate> {
    return api.patch<ExpenseTemplate>(
      `${BASE_PATH}/${id}`,
      {
        is_deleted: true,
      }
    );
  },


  // Permanently delete template
  remove(id: string): Promise<void> {
    return api.delete<void>(
      `${BASE_PATH}/${id}`
    );
  },


  // ============================
  // Template Rows
  // ============================

  // Add row to template
  addRow(
    templateId: string,
    payload: CreateTemplateRowPayload
  ): Promise<ExpenseTemplateRow> {
    return api.post<ExpenseTemplateRow>(
      `${BASE_PATH}/${templateId}/rows`,
      payload
    );
  },


  // Update template row
  updateRow(
    templateId: string,
    rowId: string,
    payload: UpdateTemplateRowPayload
  ): Promise<ExpenseTemplateRow> {
    return api.patch<ExpenseTemplateRow>(
      `${BASE_PATH}/${templateId}/rows/${rowId}`,
      payload
    );
  },


  // Remove template row
  removeRow(
    templateId: string,
    rowId: string
  ): Promise<void> {
    return api.delete<void>(
      `${BASE_PATH}/${templateId}/rows/${rowId}`
    );
  },
};