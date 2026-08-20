import { useEffect, useState, useCallback } from 'react';
import {
  Save,
  Send,
  Users,
  Truck,
  X,
  Wallet,
  CalendarDays,
  Building2,
  CreditCard,
  Tag,
  IndianRupee,
  MessageSquare,
  Hash,
  Route,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileText,
} from 'lucide-react';

import { useApp } from '../../store/AppContext';
import { apiRequest } from '../../lib/api';

import {
  ExpenseCategory,
  ExpenseName,
  Employee,
  Driver,
  Vehicle,
} from '../../types';

import { getLocations } from '../../lib/locationApi';

// ============================================================
// Types
// ============================================================

interface Location {
  locationId: string;
  branchName: string;
  [key: string]: unknown;
}

interface CashSession {
  id: string;
  system_balance: number;
  posted_expense_amount: number;
  status: string;
}

interface FormState {
  date: string;
  location_id: string;
  category_id: string;
  expense_name_id: string;
  amount: string;
  payment_mode: string;
  remarks: string;
  driver_id: string;
  vehicle_id: string;
  route_id: string;
  employee_ids: string[];
  reference_number: string;
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
  const res = await apiRequest(path, { method: 'GET' });

  return (
    res &&
      typeof res === 'object' &&
      'data' in res
      ? (res as { data: T }).data
      : res
  ) as T;
}

// ============================================================
// Theme System
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

    badge: {
      success: 'bg-emerald-100 text-emerald-600',
      warning: 'bg-amber-100 text-amber-600',
      error: 'bg-red-100 text-red-600',
      info: 'bg-blue-100 text-blue-600',
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

    badge: {
      success: 'bg-emerald-900/30 text-emerald-400',
      warning: 'bg-amber-900/30 text-amber-400',
      error: 'bg-red-900/30 text-red-400',
      info: 'bg-blue-900/30 text-blue-400',
    },
  },
};

// ============================================================
// Component
// ============================================================

export function PettyCashExpense() {
  const { notify, navigate } = useApp();

  const [isDark] = useState(false);
  const currentTheme = isDark ? theme.dark : theme.light;

  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenseNames, setExpenseNames] = useState<ExpenseName[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [session, setSession] = useState<CashSession | null>(null);
  const [selectedExpenseName, setSelectedExpenseName] =
    useState<ExpenseName | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] =
    useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    date: new Date().toISOString().split('T')[0],
    location_id: '',
    category_id: '',
    expense_name_id: '',
    amount: '',
    payment_mode: 'cash',
    remarks: '',
    driver_id: '',
    vehicle_id: '',
    route_id: '',
    employee_ids: [],
    reference_number: '',
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
          driverData,
          vehicleData,
        ] = await Promise.all([
          getLocations(),
          fetchJson<ExpenseCategory[]>(
            '/api/v1/masters/categories?active_only=true',
          ),
          fetchJson<Employee[]>('/db/employees/query').catch(
            () => [] as Employee[],
          ),
          fetchJson<Driver[]>('/db/drivers/query').catch(
            () => [] as Driver[],
          ),
          fetchJson<Vehicle[]>('/db/vehicles/query').catch(
            () => [] as Vehicle[],
          ),
        ]);

        setLocations((locationData ?? []) as Location[]);
        setCategories(categoryData ?? []);
        setEmployees(employeeData ?? []);
        setDrivers(driverData ?? []);
        setVehicles(vehicleData ?? []);
      } catch {
        notify('Failed to load master data', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadMasters();
  }, [notify]);

  // ============================================================
  // Load Expense Names When Category Changes
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
        notify('Failed to load expense names', 'error'),
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
  // Apply Defaults When Expense Name Changes
  // ============================================================

  useEffect(() => {
    if (!form.expense_name_id) {
      setSelectedExpenseName(null);
      return;
    }

    const found =
      expenseNames.find(e => e.id === form.expense_name_id) ?? null;

    setSelectedExpenseName(found);

    if (found) {
      setForm(p => ({
        ...p,
        amount: found.default_amount
          ? String(found.default_amount)
          : p.amount,
        remarks: found.default_remarks ?? p.remarks,
      }));
    }
  }, [form.expense_name_id, expenseNames]);

  // ============================================================
  // Auto Assign Vehicle When Driver Changes
  // ============================================================

  useEffect(() => {
    if (!form.driver_id) return;

    const match = vehicles.find(
      v => v.driver_id === form.driver_id,
    );

    if (match) {
      setForm(p => ({
        ...p,
        vehicle_id: match.id,
      }));
    }
  }, [form.driver_id, vehicles]);

  // ============================================================
  // Load Open Cash Session For Location + Date
  // ============================================================

  useEffect(() => {
    if (!form.location_id) {
      setSession(null);
      return;
    }

    apiRequest('/db/cash_sessions/query', {
      method: 'POST',
      body: JSON.stringify({
        filters: [
          {
            op: 'eq',
            field: 'business_date',
            value: form.date,
          },
          {
            op: 'eq',
            field: 'location_id',
            value: form.location_id,
          },
          {
            op: 'eq',
            field: 'status',
            value: 'open',
          },
        ],
        limit: 1,
      }),
    })
      .then((res: unknown) => {
        const maybeObj =
          typeof res === 'object' && res !== null
            ? (res as Record<string, unknown>)
            : null;

        const raw =
          maybeObj && 'data' in maybeObj
            ? maybeObj.data
            : res;

        const rows = Array.isArray(raw) ? raw : [];

        setSession(rows[0] ?? null);
      })
      .catch(() => setSession(null));
  }, [form.location_id, form.date]);

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
        ? p.employee_ids.filter(e => e !== id)
        : [...p.employee_ids, id],
    }));
  }

  // ============================================================
  // Computed
  // ============================================================

  const amount = parseFloat(form.amount) || 0;

  const hasInsufficientCash =
    form.payment_mode === 'cash' &&
    session != null &&
    amount > session.system_balance;

  const needsEmployee =
    !!selectedExpenseName?.employee_required;

  const needsDriver =
    !!selectedExpenseName?.driver_required;

  const needsVehicle =
    !!selectedExpenseName?.vehicle_required;

  const needsApproval =
    !!selectedExpenseName?.approval_required ||
    !!(
      categories.find(c => c.id === form.category_id)
        ?.approval_required
    );

  const canSubmit =
    !!form.location_id &&
    !!form.expense_name_id &&
    !!form.amount &&
    amount > 0 &&
    !hasInsufficientCash &&
    !(needsEmployee && form.employee_ids.length === 0) &&
    !(needsDriver && !form.driver_id);

  // ============================================================
  // Submit
  // ============================================================

  async function submitExpense(asDraft: boolean) {
    if (
      !form.location_id ||
      !form.expense_name_id ||
      !form.amount
    ) {
      notify(
        'Location, expense name, and amount are required',
        'error',
      );
      return;
    }

    if (
      needsEmployee &&
      form.employee_ids.length === 0
    ) {
      notify(
        'Please select at least one employee',
        'error',
      );
      return;
    }

    if (needsDriver && !form.driver_id) {
      notify('Please select a driver', 'error');
      return;
    }

    if (hasInsufficientCash) {
      notify('Insufficient cash balance', 'error');
      return;
    }

    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        category_id: form.category_id,
        expense_name_id: form.expense_name_id,
        location_id: form.location_id,
        amount,
        date: form.date,
        payment_mode: form.payment_mode,
        employee_ids: form.employee_ids,
        driver_id: form.driver_id || null,
        vehicle_id: form.vehicle_id || null,
        route_id: form.route_id || null,
        remarks: form.remarks || null,
        reference_number:
          form.reference_number || null,
      };

      const sessionParam =
        form.payment_mode === 'cash' && session
          ? `?cash_session_id=${session.id}`
          : '';

      const res = await apiRequest(
        `/api/v1/expenses/${sessionParam}`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      ) as
        | { data?: Record<string, unknown> }
        | Record<string, unknown>;

      const saved = (
        res &&
          typeof res === 'object' &&
          'data' in res
          ? res.data
          : res
      ) as Record<string, unknown>;

      if (asDraft && saved?.id) {
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
          ? 'Expense saved as draft'
          : 'Expense submitted successfully',
        'success',
      );

      return saved;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to submit expense';

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
    const saved = await submitExpense(asDraft);

    if (saved) {
      if (addAnother) {
        setForm({
          date: form.date,
          location_id: form.location_id,
          category_id: '',
          expense_name_id: '',
          amount: '',
          payment_mode: form.payment_mode,
          remarks: '',
          driver_id: '',
          vehicle_id: '',
          route_id: '',
          employee_ids: [],
          reference_number: '',
        });
      } else {
        navigate('expenses/my');
      }
    }
  }

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <div
        className={`min-h-[80vh] flex items-center justify-center ${currentTheme.background}`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div
              className={`w-14 h-14 border-[3px] ${isDark
                ? 'border-slate-700'
                : 'border-slate-200'
                } rounded-full`}
            />

            <div
              className={`w-14 h-14 border-[3px] ${isDark
                ? 'border-indigo-400'
                : 'border-indigo-500'
                } border-t-transparent rounded-full animate-spin absolute top-0 left-0`}
            />
          </div>

          <div className="text-center">
            <p
              className={`${isDark
                ? 'text-slate-300'
                : 'text-slate-600'
                } font-medium text-sm`}
            >
              Loading master data
            </p>

            <p
              className={`${isDark
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
  // Payment Mode Config
  // ============================================================

  const paymentModes = [
    {
      value: 'cash',
      label: 'Cash',
      icon: Wallet,
    },
    {
      value: 'upi',
      label: 'UPI',
      icon: CreditCard,
    },
    {
      value: 'card',
      label: 'Card',
      icon: CreditCard,
    },
    {
      value: 'bank_transfer',
      label: 'Transfer',
      icon: Building2,
    },
  ] as const;

  // ============================================================
  // Render
  // ============================================================

  return (
    <div
      className={`min-h-screen ${currentTheme.background} transition-colors duration-300`}
    >
      {/* Header */}

      <div
        className={`sticky top-0 z-30 backdrop-blur-sm ${currentTheme.header} border-b transition-colors duration-300`}
      >
        <div className="max-w-full mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-semibold ${currentTheme.text.primary}`}
              >
                Add Expense
              </span>
            </div>

            <button
              onClick={() => navigate('expenses/my')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${currentTheme.button.outline} rounded-lg transition-all duration-200`}
            >
              <X size={14} />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}

      <div className="max-w-full mx-auto px-4 lg:px-6 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

          {/* LEFT */}

          <div className="xl:col-span-8 space-y-4">

            {/* Basic Details */}

            <div
              className={`rounded-xl border ${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.cardShadow} overflow-hidden transition-colors duration-300`}
            >
              <div
                className={`px-4 py-2.5 border-b ${isDark
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
                      className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 outline-none ${focusedField === 'date'
                        ? currentTheme.input.focus
                        : `${currentTheme.input.base} ${isDark
                          ? 'text-slate-200'
                          : 'text-slate-700'
                        }`
                        }`}
                      value={form.date}
                      onChange={e =>
                        setField('date', e.target.value)
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
                        className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 outline-none appearance-none cursor-pointer ${focusedField === 'location_id'
                          ? currentTheme.input.focus
                          : `${currentTheme.input.base} ${isDark
                            ? 'text-slate-200'
                            : 'text-slate-700'
                          }`
                          }`}
                        value={form.location_id}
                        onChange={e =>
                          setField(
                            'location_id',
                            e.target.value,
                          )
                        }
                        onFocus={() =>
                          setFocusedField('location_id')
                        }
                        onBlur={() =>
                          setFocusedField(null)
                        }
                      >
                        <option value="">
                          Select location
                        </option>

                        {locations.map(location => (
                          <option
                            key={location.locationId}
                            value={location.locationId}
                          >
                            {location.branchName}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Payment Mode */}

                  <div className="space-y-1">
                    <label
                      className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                    >
                      <CreditCard size={12} />
                      Payment
                    </label>

                    <div className="grid grid-cols-4 gap-1">
                      {paymentModes.map(pm => {
                        const Icon = pm.icon;
                        const active =
                          form.payment_mode === pm.value;

                        return (
                          <button
                            key={pm.value}
                            type="button"
                            onClick={() =>
                              setField(
                                'payment_mode',
                                pm.value,
                              )
                            }
                            className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border text-xs font-medium transition-all duration-200 ${active
                              ? isDark
                                ? 'border-indigo-400 bg-indigo-900/30 text-indigo-300 shadow-sm ring-2 ring-indigo-900/30'
                                : 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-100'
                              : `${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.text.muted} ${currentTheme.cardHover}`
                              }`}
                            title={pm.label}
                          >
                            <Icon size={12} />

                            <span className="truncate w-full text-center leading-tight text-[10px]">
                              {pm.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expense Details */}

            <div
              className={`rounded-xl border ${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.cardShadow} overflow-hidden transition-colors duration-300`}
            >
              <div
                className={`px-4 py-2.5 border-b ${isDark
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
                      className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                    >
                      Category
                      <span className="text-red-400">*</span>
                    </label>

                    <div className="relative">
                      <select
                        className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 outline-none appearance-none cursor-pointer ${focusedField === 'category_id'
                          ? currentTheme.input.focus
                          : `${currentTheme.input.base} ${isDark
                            ? 'text-slate-200'
                            : 'text-slate-700'
                          }`
                          }`}
                        value={form.category_id}
                        onChange={e =>
                          setField(
                            'category_id',
                            e.target.value,
                          )
                        }
                        onFocus={() =>
                          setFocusedField('category_id')
                        }
                        onBlur={() =>
                          setFocusedField(null)
                        }
                      >
                        <option value="">
                          Select category
                        </option>

                        {categories.map(c => (
                          <option
                            key={c.id}
                            value={c.id}
                          >
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Expense Name */}

                  <div className="space-y-1">
                    <label
                      className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                    >
                      Expense
                      <span className="text-red-400">*</span>
                    </label>

                    <div className="relative">
                      <select
                        className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 outline-none appearance-none cursor-pointer ${!form.category_id
                          ? `opacity-50 cursor-not-allowed ${currentTheme.input.base}`
                          : focusedField ===
                            'expense_name_id'
                            ? currentTheme.input.focus
                            : `${currentTheme.input.base} ${isDark
                              ? 'text-slate-200'
                              : 'text-slate-700'
                            }`
                          }`}
                        value={form.expense_name_id}
                        onChange={e =>
                          setField(
                            'expense_name_id',
                            e.target.value,
                          )
                        }
                        disabled={!form.category_id}
                        onFocus={() =>
                          setFocusedField(
                            'expense_name_id',
                          )
                        }
                        onBlur={() =>
                          setFocusedField(null)
                        }
                      >
                        <option value="">
                          Select expense
                        </option>

                        {expenseNames.map(e => (
                          <option
                            key={e.id}
                            value={e.id}
                          >
                            {e.name}
                          </option>
                        ))}
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
                      <span className="text-red-400">*</span>
                    </label>

                    <div className="relative">
                      <span
                        className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark
                          ? 'text-slate-500'
                          : 'text-slate-400'
                          } font-semibold text-sm`}
                      >
                        ₹
                      </span>

                      <input
                        type="number"
                        className={`w-full pl-7 pr-3 py-2 rounded-lg border text-sm font-bold transition-all duration-200 outline-none ${hasInsufficientCash
                          ? currentTheme.input.error
                          : focusedField === 'amount'
                            ? currentTheme.input.focus
                            : `${currentTheme.input.base} ${isDark
                              ? 'text-slate-200'
                              : 'text-slate-700'
                            }`
                          }`}
                        placeholder="0.00"
                        min={0}
                        value={form.amount}
                        onChange={e =>
                          setField(
                            'amount',
                            e.target.value,
                          )
                        }
                        onFocus={() =>
                          setFocusedField('amount')
                        }
                        onBlur={() =>
                          setFocusedField(null)
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Remarks & Reference */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">

                  <div className="space-y-1">
                    <label
                      className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                    >
                      <MessageSquare size={12} />
                      Remarks
                    </label>

                    <textarea
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-all duration-200 outline-none resize-none ${focusedField === 'remarks'
                        ? currentTheme.input.focus
                        : `${currentTheme.input.base} ${isDark
                          ? 'text-slate-200'
                          : 'text-slate-700'
                        }`
                        }`}
                      rows={2}
                      placeholder="Optional remarks..."
                      value={form.remarks}
                      onChange={e =>
                        setField(
                          'remarks',
                          e.target.value,
                        )
                      }
                      onFocus={() =>
                        setFocusedField('remarks')
                      }
                      onBlur={() =>
                        setFocusedField(null)
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                    >
                      <Hash size={12} />
                      Reference
                    </label>

                    <input
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-all duration-200 outline-none ${focusedField ===
                        'reference_number'
                        ? currentTheme.input.focus
                        : `${currentTheme.input.base} ${isDark
                          ? 'text-slate-200'
                          : 'text-slate-700'
                        }`
                        }`}
                      placeholder="Cheque no., UPI ref."
                      value={form.reference_number}
                      onChange={e =>
                        setField(
                          'reference_number',
                          e.target.value,
                        )
                      }
                      onFocus={() =>
                        setFocusedField(
                          'reference_number',
                        )
                      }
                      onBlur={() =>
                        setFocusedField(null)
                      }
                    />

                    <p
                      className={`text-[10px] ${isDark
                        ? 'text-slate-500'
                        : 'text-slate-400'
                        }`}
                    >
                      Optional for reconciliation
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Assignment */}

            {needsEmployee && (
              <div
                className={`rounded-xl border ${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.cardShadow} overflow-hidden transition-colors duration-300`}
              >
                <div
                  className={`px-4 py-2.5 border-b ${isDark
                    ? 'border-slate-700 bg-slate-700/30'
                    : 'border-slate-100 bg-slate-50/50'
                    }`}
                >
                  <div className="flex items-center justify-between">
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

                    {amount > 0 &&
                      form.employee_ids.length > 0 && (
                        <span
                          className={`text-xs font-semibold ${isDark
                            ? 'text-indigo-400 bg-indigo-900/30'
                            : 'text-indigo-600 bg-indigo-50'
                            } px-2 py-0.5 rounded-full`}
                        >
                          {formatCurrency(
                            amount /
                            form.employee_ids.length,
                          )}{' '}
                          × {form.employee_ids.length}
                        </span>
                      )}
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {employees.map(emp => {
                      const selected =
                        form.employee_ids.includes(
                          emp.id,
                        );

                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() =>
                            toggleEmployee(emp.id)
                          }
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all duration-200 ${selected
                            ? isDark
                              ? 'border-indigo-400 bg-indigo-900/30 text-indigo-300 shadow-sm ring-2 ring-indigo-900/30'
                              : 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-100'
                            : `${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.text.secondary} ${currentTheme.cardHover}`
                            }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${selected
                              ? 'border-indigo-500 bg-indigo-500'
                              : `${isDark
                                ? 'border-slate-600'
                                : 'border-slate-300'
                              } ${currentTheme.card}`
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
                            <p
                              className={`text-xs font-semibold truncate ${isDark
                                ? 'text-slate-200'
                                : 'text-slate-700'
                                }`}
                            >
                              {emp.name}
                            </p>

                            <p
                              className={`text-[10px] ${isDark
                                ? 'text-slate-500'
                                : 'text-slate-400'
                                } truncate`}
                            >
                              {(emp as {
                                department?: string;
                              }).department || '—'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Driver & Vehicle */}

            {needsDriver && (
              <div
                className={`rounded-xl border ${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.cardShadow} overflow-hidden transition-colors duration-300`}
              >
                <div
                  className={`px-4 py-2.5 border-b ${isDark
                    ? 'border-slate-700 bg-slate-700/30'
                    : 'border-slate-100 bg-slate-50/50'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Truck
                      size={14}
                      className="text-indigo-500"
                    />

                    <h2
                      className={`text-xs font-semibold ${currentTheme.text.secondary} uppercase tracking-wider`}
                    >
                      Driver & Vehicle
                    </h2>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    {/* Driver */}

                    <div className="space-y-1">
                      <label
                        className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                      >
                        Driver
                        <span className="text-red-400">
                          *
                        </span>
                      </label>

                      <div className="relative">
                        <select
                          className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 outline-none appearance-none cursor-pointer ${focusedField ===
                            'driver_id'
                            ? currentTheme.input.focus
                            : `${currentTheme.input.base} ${isDark
                              ? 'text-slate-200'
                              : 'text-slate-700'
                            }`
                            }`}
                          value={form.driver_id}
                          onChange={e =>
                            setField(
                              'driver_id',
                              e.target.value,
                            )
                          }
                          onFocus={() =>
                            setFocusedField(
                              'driver_id',
                            )
                          }
                          onBlur={() =>
                            setFocusedField(null)
                          }
                        >
                          <option value="">
                            Select driver
                          </option>

                          {drivers.map(d => (
                            <option
                              key={d.id}
                              value={d.id}
                            >
                              {d.name}
                            </option>
                          ))}
                        </select>

                        <ChevronDown
                          size={14}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                      </div>
                    </div>

                    {/* Vehicle */}

                    {needsVehicle && (
                      <div className="space-y-1">
                        <label
                          className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                        >
                          Vehicle
                        </label>

                        <div className="relative">
                          <select
                            className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 outline-none appearance-none cursor-pointer ${focusedField ===
                              'vehicle_id'
                              ? currentTheme.input.focus
                              : `${currentTheme.input.base} ${isDark
                                ? 'text-slate-200'
                                : 'text-slate-700'
                              }`
                              }`}
                            value={form.vehicle_id}
                            onChange={e =>
                              setField(
                                'vehicle_id',
                                e.target.value,
                              )
                            }
                            onFocus={() =>
                              setFocusedField(
                                'vehicle_id',
                              )
                            }
                            onBlur={() =>
                              setFocusedField(null)
                            }
                          >
                            <option value="">
                              Select vehicle
                            </option>

                            {vehicles.map(v => (
                              <option
                                key={v.id}
                                value={v.id}
                              >
                                {
                                  (
                                    v as Vehicle & {
                                      vehicle_no?: string;
                                    }
                                  ).vehicle_no ??
                                  v.id
                                }
                              </option>
                            ))}
                          </select>

                          <ChevronDown
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Route */}

                    <div className="space-y-1">
                      <label
                        className={`flex items-center gap-1 text-xs font-medium ${currentTheme.text.muted} uppercase tracking-wider`}
                      >
                        <Route size={12} />
                        Route
                      </label>

                      <input
                        className={`w-full px-3 py-2 rounded-lg border text-sm transition-all duration-200 outline-none ${focusedField ===
                          'route_id'
                          ? currentTheme.input.focus
                          : `${currentTheme.input.base} ${isDark
                            ? 'text-slate-200'
                            : 'text-slate-700'
                          }`
                          }`}
                        placeholder="Optional"
                        value={form.route_id}
                        onChange={e =>
                          setField(
                            'route_id',
                            e.target.value,
                          )
                        }
                        onFocus={() =>
                          setFocusedField(
                            'route_id',
                          )
                        }
                        onBlur={() =>
                          setFocusedField(null)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Summary Sidebar */}

          <div className="xl:col-span-4 space-y-4">
            <div className="sticky top-20 space-y-4">

              {/* Cash Balance */}

              {form.location_id && (
                <div
                  className={`rounded-xl border p-4 transition-all duration-300 ${session
                    ? hasInsufficientCash
                      ? isDark
                        ? 'bg-gradient-to-br from-red-900/20 to-rose-900/20 border-red-800'
                        : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
                      : isDark
                        ? 'bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border-emerald-800'
                        : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
                    : isDark
                      ? 'bg-gradient-to-br from-amber-900/20 to-orange-900/20 border-amber-800'
                      : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                    }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${session
                        ? hasInsufficientCash
                          ? isDark
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-red-100 text-red-600'
                          : isDark
                            ? 'bg-emerald-900/30 text-emerald-400'
                            : 'bg-emerald-100 text-emerald-600'
                        : isDark
                          ? 'bg-amber-900/30 text-amber-400'
                          : 'bg-amber-100 text-amber-600'
                        }`}
                    >
                      <Wallet size={16} />
                    </div>

                    <div>
                      <p
                        className={`text-[10px] font-semibold ${isDark
                          ? 'text-slate-400'
                          : 'text-slate-500'
                          } uppercase tracking-wider`}
                      >
                        Cash Balance
                      </p>

                      {session ? (
                        <p
                          className={`text-lg font-bold ${hasInsufficientCash
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                        >
                          {formatCurrency(
                            session.system_balance,
                          )}
                        </p>
                      ) : (
                        <p
                          className={`text-sm font-medium ${isDark
                            ? 'text-amber-400'
                            : 'text-amber-700'
                            }`}
                        >
                          No active session
                        </p>
                      )}
                    </div>
                  </div>

                  {session &&
                    !hasInsufficientCash &&
                    amount > 0 && (
                      <div
                        className={`border-t ${isDark
                          ? 'border-emerald-800/60'
                          : 'border-emerald-200/60'
                          } pt-2 mt-1`}
                      >
                        <div className="flex justify-between text-[10px]">
                          <span
                            className={
                              isDark
                                ? 'text-emerald-400'
                                : 'text-emerald-600'
                            }
                          >
                            After expense
                          </span>

                          <span
                            className={`font-bold ${isDark
                              ? 'text-emerald-400'
                              : 'text-emerald-700'
                              }`}
                          >
                            {formatCurrency(
                              session.system_balance -
                              amount,
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                  {hasInsufficientCash && (
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-red-600 dark:text-red-400 font-medium">
                      <AlertTriangle size={12} />
                      Insufficient balance
                    </div>
                  )}
                </div>
              )}

              {/* Expense Summary */}

              <div
                className={`rounded-xl border ${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.cardShadow} overflow-hidden transition-colors duration-300`}
              >
                <div
                  className={`px-4 py-2.5 border-b ${isDark
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

                  {/* Location Summary */}

                  <div className="flex justify-between items-center">
                    <span
                      className={`text-[10px] ${isDark
                        ? 'text-slate-500'
                        : 'text-slate-400'
                        } font-medium`}
                    >
                      Location
                    </span>

                    <span
                      className={`text-xs font-semibold ${currentTheme.text.primary} truncate max-w-[140px]`}
                    >
                      {locations.find(
                        l => l.locationId === form.location_id
                      )?.branchName || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span
                      className={`text-[10px] ${isDark
                        ? 'text-slate-500'
                        : 'text-slate-400'
                        } font-medium`}
                    >
                      Category
                    </span>

                    <span
                      className={`text-xs font-semibold ${currentTheme.text.primary} truncate max-w-[140px]`}
                    >
                      {categories.find(
                        c =>
                          c.id === form.category_id,
                      )?.name || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span
                      className={`text-[10px] ${isDark
                        ? 'text-slate-500'
                        : 'text-slate-400'
                        } font-medium`}
                    >
                      Expense
                    </span>

                    <span
                      className={`text-xs font-semibold ${currentTheme.text.primary} truncate max-w-[140px]`}
                    >
                      {expenseNames.find(
                        e =>
                          e.id ===
                          form.expense_name_id,
                      )?.name || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span
                      className={`text-[10px] ${isDark
                        ? 'text-slate-500'
                        : 'text-slate-400'
                        } font-medium`}
                    >
                      Payment
                    </span>

                    <span
                      className={`text-xs font-semibold ${currentTheme.text.primary} capitalize`}
                    >
                      {form.payment_mode.replace(
                        '_',
                        ' ',
                      )}
                    </span>
                  </div>

                  {needsEmployee && (
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-[10px] ${isDark
                          ? 'text-slate-500'
                          : 'text-slate-400'
                          } font-medium`}
                      >
                        Employees
                      </span>

                      <span
                        className={`text-xs font-semibold ${currentTheme.text.primary}`}
                      >
                        {form.employee_ids.length ||
                          '—'}
                      </span>
                    </div>
                  )}

                  <div
                    className={`border-t ${isDark
                      ? 'border-slate-700'
                      : 'border-slate-100'
                      } pt-3`}
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-[10px] ${isDark
                          ? 'text-slate-500'
                          : 'text-slate-400'
                          } font-medium`}
                      >
                        Total
                      </span>

                      <span
                        className={`text-xl font-extrabold ${hasInsufficientCash
                          ? 'text-red-500 dark:text-red-400'
                          : currentTheme.text.primary
                          }`}
                      >
                        {amount > 0
                          ? formatCurrency(amount)
                          : '₹0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval Notice */}

              {needsApproval && (
                <div
                  className={`flex items-start gap-2.5 p-3 ${isDark
                    ? 'bg-blue-900/20 border-blue-800'
                    : 'bg-blue-50 border-blue-200'
                    } border rounded-xl`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg ${isDark
                      ? 'bg-blue-900/30'
                      : 'bg-blue-100'
                      } flex items-center justify-center flex-shrink-0 mt-0.5`}
                  >
                    <ShieldCheck
                      size={14}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  </div>

                  <div>
                    <p
                      className={`text-[10px] font-semibold ${isDark
                        ? 'text-blue-400'
                        : 'text-blue-800'
                        }`}
                    >
                      Approval Required
                    </p>

                    <p
                      className={`text-[10px] ${isDark
                        ? 'text-blue-400/70'
                        : 'text-blue-600'
                        } mt-0.5 leading-relaxed`}
                    >
                      Will be routed for approval
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}

              <div
                className={`rounded-xl border ${currentTheme.cardBorder} ${currentTheme.card} ${currentTheme.cardShadow} p-4 space-y-2 transition-colors duration-300`}
              >
                <button
                  onClick={() =>
                    handleSubmit(false)
                  }
                  disabled={
                    saving || !canSubmit
                  }
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-200 ${canSubmit && !saving
                    ? currentTheme.button.primary +
                    ' active:scale-[0.98]'
                    : `${isDark
                      ? 'bg-slate-700 text-slate-500'
                      : 'bg-slate-100 text-slate-400'
                    } cursor-not-allowed`
                    }`}
                >
                  <Send size={14} />

                  {saving
                    ? 'Submitting...'
                    : 'Submit'}
                </button>

                <button
                  onClick={() =>
                    handleSubmit(false, true)
                  }
                  disabled={
                    saving || !canSubmit
                  }
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-200 ${canSubmit && !saving
                    ? currentTheme.button.secondary +
                    ' active:scale-[0.98]'
                    : `${isDark
                      ? 'bg-slate-700/50 text-slate-500'
                      : 'bg-slate-50 text-slate-400'
                    } border ${isDark
                      ? 'border-slate-700'
                      : 'border-slate-200'
                    } cursor-not-allowed`
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
                    !form.expense_name_id ||
                    !form.amount
                  }
                  className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-[0.98] ${currentTheme.button.outline} disabled:opacity-40 disabled:cursor-not-allowed`}
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