export type UserRole = 'admin' | 'accounts' | 'outlet_incharge' | 'driver_supervisor' | 'manager' | 'owner' | 'auditor';

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  costCenterId?: string;
  costCenterName?: string;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  type: 'branch' | 'department' | 'vehicle';
  active: boolean;
}

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  approval_required: boolean;
  receipt_required: boolean;
  receipt_required_above_amount?: number;
  daily_limit_amount?: number;
  monthly_limit_amount?: number;
  color: string;
  active: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface ExpenseName {
  id: string;
  category_id: string;
  code: string;
  name: string;
  default_amount: number;
  default_remarks?: string;
  employee_required: boolean;
  allow_multiple_employees: boolean;
  driver_required: boolean;
  vehicle_required: boolean;
  route_required: boolean;
  receipt_required: boolean;
  approval_required: boolean;
  active: boolean;
  is_deleted: boolean;
  created_at: string;
  // joined
  category_name?: string;
  category_color?: string;
}

export interface EmployeeAllocation {
  employee_id: string;
  amount: number;

  // joined by backend
  employee_name?: string;
}

export interface ExpenseTemplate {
  id: string;
  template_code: string;
  template_name: string;

  location_id: string;

  active: boolean;
  is_deleted: boolean;
  created_at: string;

  // joined
  location_name?: string;

  // TemplateRepository returns rows
  rows?: ExpenseTemplateRow[];
}

export interface ExpenseTemplateRow {
  id: string;
  template_id: string;

  expense_name_id: string;
  category_id: string;

  default_amount: number;

  employee_required: boolean;

  remarks?: string;
  sequence: number;

  // Multiple employees can be allocated
  employee_allocations: EmployeeAllocation[];

  // joined
  expense_name?: string;
  category_name?: string;
}

export interface Employee {
  id: string;
  name: string;
  department?: string;
  [key: string]: unknown;
}

export interface Driver {
  id: string;
  driver_code: string;
  name: string;
  mobile?: string;
  active: boolean;
}

export interface Vehicle {
  id: string;
  vehicle_no: string;
  vehicle_type: string;
  driver_id?: string;
  active: boolean;
  // joined
  driver_name?: string;
}

export interface CashSession {
  id: string;
  business_date: string;
  cost_center_id: string;
  opening_amount: number;
  additional_cash_amount: number;
  posted_expense_amount: number;
  reserved_expense_amount: number;
  cash_returned_amount: number;
  adjustment_amount: number;
  system_balance: number;
  physical_cash?: number;
  variance_amount: number;
  status: 'open' | 'closing_submitted' | 'verified' | 'locked' | 'reopened';
  given_by?: string;
  received_by?: string;
  opening_remarks?: string;
  closing_remarks?: string;
  locked_at?: string;
  created_at: string;
  // joined
  cost_center_name?: string;
}

export type ExpenseStatus = 'draft' | 'submitted' | 'pending_approval' | 'clarification_required' | 'approved' | 'posted' | 'rejected' | 'reversed' | 'closed' | 'cancelled';

export interface EmployeeAssignment {
  employeeId: string;
  employeeName: string;
  shareAmount: number;
}

export interface ExpenseEntry {
  id: string;
  expense_no: string;
  business_date: string;
  cash_session_id?: string;
  cost_center_id: string;
  category_id: string;
  expense_name_id: string;
  template_id?: string;
  batch_id?: string;
  amount: number;
  payment_mode: string;
  remarks?: string;
  category_name: string;
  expense_name: string;
  cost_center_name: string;
  employee_assignments: EmployeeAssignment[];
  driver_id?: string;
  driver_name?: string;
  driver_mobile?: string;
  vehicle_id?: string;
  vehicle_no?: string;
  route_name?: string;
  receipt_files: Array<{ fileId: string; fileName: string; url: string }>;
  approval_required: boolean;
  approval_status: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  approval_remarks?: string;
  status: ExpenseStatus;
  entered_by: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRule {
  id: string;
  rule_name: string;
  min_amount: number;
  max_amount?: number;
  approver_role: string;
  sla_hours: number;
  active: boolean;
  priority: number;
}

export interface DashboardStats {
  totalOpeningCash: number;
  todayExpenses: number;
  totalBalance: number;
  pendingApprovals: number;
  costCenterSummaries: CashSession[];
  recentExpenses: ExpenseEntry[];
  categoryBreakdown: { name: string; amount: number; color: string }[];
}

export type ThemeColor = 'blue' | 'teal' | 'emerald' | 'slate' | 'rose' | 'custom';

 export type ThemeMode = 'light' | 'dark';

 export interface AppTheme {
   mode: ThemeMode;
   color: ThemeColor;
   customColor?: string;
   sidebarCompact: boolean;
 }