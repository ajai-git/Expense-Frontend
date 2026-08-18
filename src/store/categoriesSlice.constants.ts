import { ExpenseCategory } from '../types';

export const EMPTY_CATEGORY: Partial<ExpenseCategory> = {
  code: '',
  name: '',
  description: '',
  approval_required: false,
  receipt_required: false,
  receipt_required_above_amount: 1000,
  daily_limit_amount: undefined,
  monthly_limit_amount: undefined,
  color: '#3B82F6',
  active: true,
};