import { ExpenseName } from '../types';

export const EMPTY_EXPENSE_NAME: Partial<ExpenseName> = {
  code: '',
  name: '',
  default_amount: 0,
  default_remarks: '',
  employee_required: false,
  allow_multiple_employees: false,
  driver_required: false,
  vehicle_required: false,
  route_required: false,
  receipt_required: false,
  approval_required: false,
  active: true,
};