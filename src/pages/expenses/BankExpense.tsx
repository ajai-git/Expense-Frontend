import { useEffect, useState, useCallback } from 'react';
import {
  Save,
  Send,
  Users,
  X,
  CalendarDays,
  Building2,
  CreditCard,
  Tag,
  IndianRupee,
  MessageSquare,
  Hash,
  ShieldCheck,
  ChevronDown,
  FileText,
  CheckCircle2,
} from 'lucide-react';

import { useApp } from '../../store/AppContext';
import { apiRequest } from '../../lib/api';

import {
  ExpenseCategory,
  ExpenseName,
  Employee,
} from '../../types';

import { getLocations } from '../../lib/locationApi';

// ============================================================
// Types
// ============================================================

interface Location {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface BankAccount {
  id: string;
  name?: string;
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  [key: string]: unknown;
}

interface FormState {
  date: string;
  location_id: string;
  bank_account_id: string;
  category_id: string;
  expense_name_id: string;
  amount: string;
  remarks: string;
  reference_number: string;
  employee_ids: string[];
}

// ============================================================
// Utilities
// ============================================================

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await apiRequest(path, {
    method: 'GET',
  });

  return (
    res &&
    typeof res === 'object' &&
    'data' in res
      ? (res as { data: T }).data
      : res
  ) as T;
}

// ============================================================
// Theme
// ============================================================

const theme = {
  light: {
    background:
      'bg-gradient-to-br from-slate-50 via-white to-indigo-50/30',
    card: 'bg-white',
    cardBorder: 'border-slate-200/80',
    cardHover: 'hover:border-slate-300 hover:bg-slate-50',
    cardShadow: 'shadow-sm',
    header: 'bg-white/95 border-slate-200/80',

    text: {
      primary: 'text-slate-800',
      secondary: 'text-slate-600',
      muted: 'text-slate-400',
      accent: 'text-indigo-600',
    },

    input: {
      base: 'border-slate-200 bg-slate-50/50',
      focus:
        'border-indigo-400 ring-4 ring-indigo-50 bg-indigo-50/30',
      error:
        'border-red-300 bg-red-50 ring-4 ring-red-50 text-red-600',
    },

    button: {
      primary:
        'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:from-indigo-700 hover:to-purple-700',
      secondary:
        'bg-white text-indigo-600 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50',
      outline:
        'border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50',
    },
  },

  dark: {
    background:
      'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900/30',
    card: 'bg-slate-800',
    cardBorder: 'border-slate-700/80',
    cardHover: 'hover:border-slate-600 hover:bg-slate-700/50',
    cardShadow: 'shadow-lg',
    header: 'bg-slate-900/95 border-slate-700/80',

    text: {
      primary: 'text-slate-100',
      secondary: 'text-slate-300',
      muted: 'text-slate-400',
      accent: 'text-indigo-400',
    },

    input: {
      base: 'border-slate-700 bg-slate-800/50',
      focus:
        'border-indigo-500 ring-4 ring-indigo-900/30 bg-slate-800',
      error:
        'border-red-600 bg-red-900/20 ring-4 ring-red-900/20 text-red-400',
    },

    button: {
      primary:
        'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-900/30 hover:shadow-xl hover:shadow-indigo-800/40 hover:from-indigo-600 hover:to-purple-600',
      secondary:
        'bg-slate-700 text-indigo-400 border-2 border-indigo-500/30 hover:border-indigo-400 hover:bg-slate-600',
      outline:
        'border-slate-600 text-slate-400 hover:text-slate-300 hover:bg-slate-700',
    },
  },
};

// ============================================================
// Component
// ============================================================

export function BankExpense() {
  const { notify, navigate } = useApp();

  const [isDark] = useState(false);
  const currentTheme = isDark ? theme.dark : theme.light;

  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenseNames, setExpenseNames] = useState<ExpenseName[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [selectedExpenseName, setSelectedExpenseName] =
    useState<ExpenseName | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [focusedField, setFocusedField] =
    useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    date: new Date().toISOString().split('T')[0],
    location_id: '',
    bank_account_id: '',
    category_id: '',
    expense_name_id: '',
    amount: '',
    remarks: '',
    reference_number: '',
    employee_ids: [],
  });

  // ============================================================
  // Load Master Data
  // ============================================================

  useEffect(() => {
    async function loadMasters() {
      setLoading(true);

      try {
        const [
          locationData,
          categoryData,
          employeeData,
          bankAccountData,
        ] = await Promise.all([
          getLocations(),

          fetchJson<ExpenseCategory[]>(
            '/api/v1/masters/categories?active_only=true',
          ),

          fetchJson<Employee[]>(
            '/db/employees/query',
          ).catch(() => [] as Employee[]),

          /*
           * Bank accounts.
           *
           * If your backend already has a dedicated bank-account
           * endpoint, replace this endpoint with that endpoint.
           */
          fetchJson<BankAccount[]>(
            '/db/bank_accounts/query',
          ).catch(() => [] as BankAccount[]),
        ]);

        setLocations((locationData ?? []) as Location[]);
        setCategories(categoryData ?? []);
        setEmployees(employeeData ?? []);
        setBankAccounts(bankAccountData ?? []);
      } catch {
        notify('Failed to load master data', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadMasters();
  }, [notify]);

  // ============================================================
  // Load Expense Names
  // ============================================================

  useEffect(() => {
    if (!form.category_id) {
      setExpenseNames([]);
      setSelectedExpenseName(null);
      return;
    }

    fetchJson<ExpenseName[]>(
      `/api/v1/masters/expense-names?active_only=true&category_id=${form.category_id}`,
    )
      .then(data => setExpenseNames(data ?? []))
      .catch(() =>
        notify(
          'Failed to load expense names',
          'error',
        ),
      );

    setForm(p => ({
      ...p,
      expense_name_id: '',
      amount: '',
      remarks: '',
    }));

    setSelectedExpenseName(null);
  }, [form.category_id, notify]);

  // ============================================================
  // Apply Expense Defaults
  // ============================================================

  useEffect(() => {
    if (!form.expense_name_id) {
      setSelectedExpenseName(null);
      return;
    }

    const found =
      expenseNames.find(
        e => e.id === form.expense_name_id,
      ) ?? null;

    setSelectedExpenseName(found);

    if (found) {
      setForm(p => ({
        ...p,
        amount: found.default_amount
          ? String(found.default_amount)
          : p.amount,
        remarks:
          found.default_remarks ?? p.remarks,
      }));
    }
  }, [
    form.expense_name_id,
    expenseNames,
  ]);

  // ============================================================
  // Helpers
  // ============================================================

  const setField = useCallback(
    <K extends keyof FormState>(
      key: K,
      value: FormState[K],
    ) => {
      setForm(p => ({
        ...p,
        [key]: value,
      }));
    },
    [],
  );

  function toggleEmployee(id: string) {
    setForm(p => ({
      ...p,
      employee_ids: p.employee_ids.includes(id)
        ? p.employee_ids.filter(
            e => e !== id,
          )
        : [...p.employee_ids, id],
    }));
  }

  // ============================================================
  // Computed
  // ============================================================

  const amount =
    parseFloat(form.amount) || 0;

  const needsEmployee =
    !!selectedExpenseName?.employee_required;

  const needsApproval =
    !!selectedExpenseName?.approval_required ||
    !!(
      categories.find(
        c => c.id === form.category_id,
      )?.approval_required
    );

  const canSubmit =
    !!form.location_id &&
    !!form.bank_account_id &&
    !!form.expense_name_id &&
    !!form.amount &&
    amount > 0 &&
    !(
      needsEmployee &&
      form.employee_ids.length === 0
    );

  // ============================================================
  // Submit
  // ============================================================

  async function submitExpense(
    asDraft: boolean,
  ) {
    if (
      !form.location_id ||
      !form.bank_account_id ||
      !form.expense_name_id ||
      !form.amount
    ) {
      notify(
        'Location, bank account, expense name, and amount are required',
        'error',
      );
      return null;
    }

    if (
      needsEmployee &&
      form.employee_ids.length === 0
    ) {
      notify(
        'Please select at least one employee',
        'error',
      );
      return null;
    }

    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        category_id: form.category_id,
        expense_name_id:
          form.expense_name_id,
        location_id: form.location_id,
        bank_account_id:
          form.bank_account_id,
        amount,
        date: form.date,

        // Bank expense does not use cash session.
        payment_mode: 'bank_transfer',

        employee_ids:
          form.employee_ids,

        remarks:
          form.remarks || null,

        reference_number:
          form.reference_number || null,
      };

      const res = await apiRequest(
        '/api/v1/expenses/',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      ) as
        | {
            data?: Record<string, unknown>;
          }
        | Record<string, unknown>;

      const saved = (
        res &&
        typeof res === 'object' &&
        'data' in res
          ? res.data
          : res
      ) as Record<string, unknown>;

      if (
        asDraft &&
        saved?.id
      ) {
        await apiRequest(
          `/api/v1/expenses/${saved.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'draft',
            }),
          },
        );
      }

      notify(
        asDraft
          ? 'Bank expense saved as draft'
          : 'Bank expense submitted successfully',
        'success',
      );

      return saved;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to submit bank expense';

      notify(message, 'error');

      return null;
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // Handle Submit
  // ============================================================

  async function handleSubmit(
    asDraft: boolean,
    addAnother = false,
  ) {
    const saved =
      await submitExpense(asDraft);

    if (!saved) return;

    if (addAnother) {
      setForm({
        date: form.date,
        location_id:
          form.location_id,
        bank_account_id:
          form.bank_account_id,
        category_id: '',
        expense_name_id: '',
        amount: '',
        remarks: '',
        reference_number: '',
        employee_ids: [],
      });
    } else {
      navigate('expenses/my');
    }
  }

  // ============================================================
  // Loading
  // ============================================================

  if (loading) {
    return (
      <div
        className={`min-h-[80vh] flex items-center justify-center ${currentTheme.background}`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div
              className={`w-14 h-14 border-[3px] ${
                isDark
                  ? 'border-slate-700'
                  : 'border-slate-200'
              } rounded-full`}
            />

            <div
              className={`w-14 h-14 border-[3px] ${
                isDark
                  ? 'border-indigo-400'
                  : 'border-indigo-500'
              } border-t-transparent rounded-full animate-spin absolute top-0 left-0`}
            />
          </div>

          <div className="text-center">
            <p
              className={`${
                isDark
                  ? 'text-slate-300'
                  : 'text-slate-600'
              } font-medium text-sm`}
            >
              Loading bank expense
            </p>

            <p
              className={`${
                isDark
                  ? 'text-slate-500'
                  : 'text-slate-400'
              } text-xs mt-1`}
            >
              Please wait
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div
      className={`min-h-screen ${currentTheme.background}`}
    >
      {/* Header */}

      <div
        className={`sticky top-0 z-30 backdrop-blur-sm ${currentTheme.header} border-b`}
      >
        <div className="max-w-full mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <Building2
                size={16}
                className="text-indigo-500"
              />

              <span
                className={`text-sm font-semibold ${currentTheme.text.primary}`}
              >
                Bank Expense
              </span>
            </div>

            <button
              onClick={() =>
                navigate('expenses/my')
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${currentTheme.button.outline} rounded-lg`}
            >
              <X size={14} />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main */}

      <div className="max-w-full mx-auto px-4 lg:px-6 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

          {/* LEFT */}

          <div className="xl:col-span-8 space-y-4">

            {/* Basic Details */}

            <div
              className={`rounded-xl border ${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.cardShadow} overflow-hidden`}
            >
              <div
                className={`px-4 py-2.5 border-b ${
                  isDark
                    ? 'border-slate-700 bg-slate-700/30'
                    : 'border-slate-100 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText
                    size={14}
                    className="text-indigo-500"
                  />

                  <h2
                    className={`text-xs font-semibold ${currentTheme.text.secondary} uppercase tracking-wider`}
                  >
                    Basic Details
                  </h2>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                  {/* Date */}

                  <div className="space-y-1">
                    <label
                      className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                    >
                      <CalendarDays size={12} />
                      Date
                    </label>

                    <input
                      type="date"
                      className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none ${
                        focusedField === 'date'
                          ? currentTheme.input.focus
                          : `${currentTheme.input.base} text-slate-700`
                      }`}
                      value={form.date}
                      onChange={e =>
                        setField(
                          'date',
                          e.target.value,
                        )
                      }
                      onFocus={() =>
                        setFocusedField('date')
                      }
                      onBlur={() =>
                        setFocusedField(null)
                      }
                    />
                  </div>

                  {/* Location */}

                  <div className="space-y-1">
                    <label
                      className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                    >
                      <Building2 size={12} />
                      Location
                      <span className="text-red-400">*</span>
                    </label>

                    <div className="relative">
                      <select
                        className={`w-full px-3 py-2 rounded-lg border text-sm font-medium appearance-none cursor-pointer outline-none ${
                          focusedField ===
                          'location_id'
                            ? currentTheme.input.focus
                            : `${currentTheme.input.base} text-slate-700`
                        }`}
                        value={
                          form.location_id
                        }
                        onChange={e =>
                          setField(
                            'location_id',
                            e.target.value,
                          )
                        }
                        onFocus={() =>
                          setFocusedField(
                            'location_id',
                          )
                        }
                        onBlur={() =>
                          setFocusedField(null)
                        }
                      >
                        <option value="">
                          Select location
                        </option>

                        {locations.map(
                          location => (
                            <option
                              key={location.id}
                              value={location.id}
                            >
                              {location.name}
                            </option>
                          ),
                        )}
                      </select>

                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Bank Account */}

                  <div className="space-y-1">
                    <label
                      className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                    >
                      <CreditCard size={12} />
                      Bank Account
                      <span className="text-red-400">*</span>
                    </label>

                    <div className="relative">
                      <select
                        className={`w-full px-3 py-2 rounded-lg border text-sm font-medium appearance-none cursor-pointer outline-none ${
                          focusedField ===
                          'bank_account_id'
                            ? currentTheme.input.focus
                            : `${currentTheme.input.base} text-slate-700`
                        }`}
                        value={
                          form.bank_account_id
                        }
                        onChange={e =>
                          setField(
                            'bank_account_id',
                            e.target.value,
                          )
                        }
                        onFocus={() =>
                          setFocusedField(
                            'bank_account_id',
                          )
                        }
                        onBlur={() =>
                          setFocusedField(null)
                        }
                      >
                        <option value="">
                          Select bank account
                        </option>

                        {bankAccounts.map(
                          account => (
                            <option
                              key={account.id}
                              value={account.id}
                            >
                              {account.bank_name ||
                                account.name ||
                                account.account_name ||
                                account.id}
                              {account.account_number
                                ? ` - ${account.account_number}`
                                : ''}
                            </option>
                          ),
                        )}
                      </select>

                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expense Details */}

            <div
              className={`rounded-xl border ${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.cardShadow} overflow-hidden`}
            >
              <div
                className={`px-4 py-2.5 border-b ${
                  isDark
                    ? 'border-slate-700 bg-slate-700/30'
                    : 'border-slate-100 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tag
                    size={14}
                    className="text-indigo-500"
                  />

                  <h2
                    className={`text-xs font-semibold ${currentTheme.text.secondary} uppercase tracking-wider`}
                  >
                    Expense Details
                  </h2>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                  {/* Category */}

                  <div className="space-y-1">
                    <label
                      className={`text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                    >
                      Category
                      <span className="text-red-400">
                        {' '}*
                      </span>
                    </label>

                    <div className="relative">
                      <select
                        className={`w-full px-3 py-2 rounded-lg border text-sm font-medium appearance-none cursor-pointer outline-none ${
                          currentTheme.input.base
                        } text-slate-700`}
                        value={
                          form.category_id
                        }
                        onChange={e =>
                          setField(
                            'category_id',
                            e.target.value,
                          )
                        }
                      >
                        <option value="">
                          Select category
                        </option>

                        {categories.map(
                          category => (
                            <option
                              key={category.id}
                              value={category.id}
                            >
                              {category.name}
                            </option>
                          ),
                        )}
                      </select>

                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Expense */}

                  <div className="space-y-1">
                    <label
                      className={`text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                    >
                      Expense
                      <span className="text-red-400">
                        {' '}*
                      </span>
                    </label>

                    <div className="relative">
                      <select
                        disabled={
                          !form.category_id
                        }
                        className={`w-full px-3 py-2 rounded-lg border text-sm font-medium appearance-none outline-none ${
                          !form.category_id
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer'
                        } ${
                          currentTheme.input.base
                        } text-slate-700`}
                        value={
                          form.expense_name_id
                        }
                        onChange={e =>
                          setField(
                            'expense_name_id',
                            e.target.value,
                          )
                        }
                      >
                        <option value="">
                          Select expense
                        </option>

                        {expenseNames.map(
                          expense => (
                            <option
                              key={expense.id}
                              value={expense.id}
                            >
                              {expense.name}
                            </option>
                          ),
                        )}
                      </select>

                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Amount */}

                  <div className="space-y-1">
                    <label
                      className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                    >
                      <IndianRupee size={12} />
                      Amount
                      <span className="text-red-400">
                        {' '}*
                      </span>
                    </label>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                        ₹
                      </span>

                      <input
                        type="number"
                        min={0}
                        placeholder="0.00"
                        className={`w-full pl-7 pr-3 py-2 rounded-lg border text-sm font-bold outline-none ${currentTheme.input.base} text-slate-700`}
                        value={form.amount}
                        onChange={e =>
                          setField(
                            'amount',
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Remarks + Reference */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">

                  <div className="space-y-1">
                    <label
                      className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                    >
                      <MessageSquare size={12} />
                      Remarks
                    </label>

                    <textarea
                      rows={2}
                      placeholder="Optional remarks..."
                      className={`w-full px-3 py-2 rounded-lg border text-sm resize-none outline-none ${currentTheme.input.base} text-slate-700`}
                      value={
                        form.remarks
                      }
                      onChange={e =>
                        setField(
                          'remarks',
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                    >
                      <Hash size={12} />
                      Reference Number
                    </label>

                    <input
                      placeholder="Cheque no., UTR, transaction ref."
                      className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${currentTheme.input.base} text-slate-700`}
                      value={
                        form.reference_number
                      }
                      onChange={e =>
                        setField(
                          'reference_number',
                          e.target.value,
                        )
                      }
                    />

                    <p className="text-[10px] text-slate-400">
                      Optional for bank reconciliation
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Assignment */}

            {needsEmployee && (
              <div
                className={`rounded-xl border ${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.cardShadow} overflow-hidden`}
              >
                <div
                  className={`px-4 py-2.5 border-b ${
                    isDark
                      ? 'border-slate-700 bg-slate-700/30'
                      : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users
                      size={14}
                      className="text-indigo-500"
                    />

                    <h2
                      className={`text-xs font-semibold ${currentTheme.text.secondary} uppercase tracking-wider`}
                    >
                      Employees
                    </h2>

                    <span className="text-red-400 text-xs">
                      *
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {employees.map(employee => {
                      const selected =
                        form.employee_ids.includes(
                          employee.id,
                        );

                      return (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() =>
                            toggleEmployee(
                              employee.id,
                            )
                          }
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left ${
                            selected
                              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                              : `${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.text.secondary} ${currentTheme.cardHover}`
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              selected
                                ? 'border-indigo-500 bg-indigo-500'
                                : 'border-slate-300'
                            }`}
                          >
                            {selected && (
                              <CheckCircle2
                                size={10}
                                className="text-white"
                              />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate text-slate-700">
                              {employee.name}
                            </p>

                            <p className="text-[10px] text-slate-400 truncate">
                              {(employee as {
                                department?: string;
                              }).department ||
                                '—'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}

          <div className="xl:col-span-4 space-y-4">
            <div className="sticky top-20 space-y-4">

              {/* Bank Information */}

              {form.bank_account_id && (
                <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Building2 size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Bank Account
                      </p>

                      <p className="text-sm font-bold text-slate-800 truncate">
                        {(() => {
                          const account =
                            bankAccounts.find(
                              a =>
                                a.id ===
                                form.bank_account_id,
                            );

                          return (
                            account?.bank_name ||
                            account?.name ||
                            account?.account_name ||
                            'Selected account'
                          );
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}

              <div
                className={`rounded-xl border ${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.cardShadow} overflow-hidden`}
              >
                <div
                  className={`px-4 py-2.5 border-b ${
                    isDark
                      ? 'border-slate-700 bg-slate-700/30'
                      : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  <h3
                    className={`text-xs font-semibold ${currentTheme.text.secondary} uppercase tracking-wider`}
                  >
                    Summary
                  </h3>
                </div>

                <div className="p-4 space-y-3">

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Location
                    </span>

                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                      {locations.find(
                        l =>
                          l.id ===
                          form.location_id,
                      )?.name || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Bank
                    </span>

                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                      {(() => {
                        const account =
                          bankAccounts.find(
                            a =>
                              a.id ===
                              form.bank_account_id,
                          );

                        return (
                          account?.bank_name ||
                          account?.name ||
                          '—'
                        );
                      })()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Category
                    </span>

                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                      {categories.find(
                        c =>
                          c.id ===
                          form.category_id,
                      )?.name || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Expense
                    </span>

                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                      {expenseNames.find(
                        e =>
                          e.id ===
                          form.expense_name_id,
                      )?.name || '—'}
                    </span>
                  </div>

                  {needsEmployee && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-medium">
                        Employees
                      </span>

                      <span className="text-xs font-semibold text-slate-800">
                        {form.employee_ids.length ||
                          '—'}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-medium">
                        Total
                      </span>

                      <span className="text-xl font-extrabold text-slate-800">
                        {amount > 0
                          ? formatCurrency(
                              amount,
                            )
                          : '₹0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval */}

              {needsApproval && (
                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck
                      size={14}
                      className="text-blue-600"
                    />
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-blue-800">
                      Approval Required
                    </p>

                    <p className="text-[10px] text-blue-600 mt-0.5">
                      Will be routed for approval
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}

              <div
                className={`rounded-xl border ${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.cardShadow} p-4 space-y-2`}
              >
                <button
                  onClick={() =>
                    handleSubmit(false)
                  }
                  disabled={
                    saving ||
                    !canSubmit
                  }
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold ${
                    canSubmit && !saving
                      ? currentTheme.button.primary
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={14} />

                  {saving
                    ? 'Submitting...'
                    : 'Submit'}
                </button>

                <button
                  onClick={() =>
                    handleSubmit(
                      false,
                      true,
                    )
                  }
                  disabled={
                    saving ||
                    !canSubmit
                  }
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold ${
                    canSubmit && !saving
                      ? currentTheme.button.secondary
                      : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <Send size={14} />

                  Submit & Add
                </button>

                <button
                  onClick={() =>
                    handleSubmit(true)
                  }
                  disabled={
                    saving ||
                    !form.location_id ||
                    !form.bank_account_id ||
                    !form.expense_name_id ||
                    !form.amount
                  }
                  className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold ${currentTheme.button.outline} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <Save size={13} />

                  Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}