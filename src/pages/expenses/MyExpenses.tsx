import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Search, Filter, Eye, PlusCircle, RefreshCw, FileText,
  Users, Truck, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../store/AppContext';
import { apiRequest } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  expense_no?: string;
  category_id: string;
  expense_name_id: string;
  cost_center_id: string;
  user_id: string;
  cash_session_id?: string | null;
  amount: number;
  date: string;
  payment_mode: string;
  employee_ids?: string[];
  driver_id?: string | null;
  driver_name?: string | null;
  vehicle_id?: string | null;
  vehicle_no?: string | null;
  route_id?: string | null;
  remarks?: string | null;
  receipt_url?: string | null;
  reference_number?: string | null;
  status: string;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  category_name?: string | null;
  expense_name?: string | null;
  cost_center_name?: string | null;
  user_name?: string | null;
}

interface PaginatedExpenses {
  data: Expense[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface PageMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short',
  });
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function ExpenseDetailModal({
  expense,
  onClose,
  onRefresh,
}: {
  expense: Expense;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { notify } = useApp();
  const [busy, setBusy] = useState(false);

  const isDraft = expense.status === 'draft';
  const isDeletable = expense.status === 'draft' || expense.status === 'pending';

  async function act(fn: () => Promise<unknown>, successMsg: string) {
    setBusy(true);
    try {
      await fn();
      notify(successMsg, 'success');
      onRefresh();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      notify(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit() {
    act(
      () => apiRequest(`/api/v1/expenses/${expense.id}/submit`, { method: 'POST' }),
      'Submitted for approval',
    );
  }

  function handleDelete() {
    if (!confirm('Permanently delete this expense?')) return;
    act(
      () => apiRequest(`/api/v1/expenses/${expense.id}`, { method: 'DELETE' }),
      'Expense deleted',
    );
  }

  const fields = [
    { label: 'Date', value: expense.date ? formatDate(expense.date) : '—' },
    { label: 'Cost Center', value: expense.cost_center_name ?? '—' },
    { label: 'Category', value: expense.category_name ?? '—' },
    { label: 'Expense Name', value: expense.expense_name ?? '—' },
    { label: 'Payment Mode', value: expense.payment_mode?.toUpperCase() ?? '—' },
    { label: 'Entered By', value: expense.user_name ?? '—' },
  ];

  return (
    <Modal open onClose={onClose} title="Expense Detail" size="lg">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(expense.amount)}</p>
            {expense.expense_no && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">{expense.expense_no}</p>
            )}
          </div>
          <StatusBadge status={expense.status} size="md" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {fields.map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">{label}</p>
              <p className="text-slate-800 font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {expense.remarks && (
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Remarks</p>
            <p className="text-slate-700 text-sm">{expense.remarks}</p>
          </div>
        )}

        {expense.reference_number && (
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Reference</p>
            <p className="text-slate-700 text-sm font-mono">{expense.reference_number}</p>
          </div>
        )}

        {(expense.employee_ids?.length ?? 0) > 0 && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
            <Users size={14} className="text-emerald-600 shrink-0" />
            <span className="text-sm text-slate-700">
              {expense.employee_ids!.length} employee{expense.employee_ids!.length > 1 ? 's' : ''} assigned
            </span>
          </div>
        )}

        {expense.driver_name && (
          <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-3">
            <Truck size={16} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Driver / Vehicle</p>
              <p className="text-sm font-medium text-slate-800">
                {expense.driver_name}
                {expense.vehicle_no ? ` — ${expense.vehicle_no}` : ''}
              </p>
            </div>
          </div>
        )}

        {expense.approved_by && (
          <div className="p-3 bg-slate-50 rounded-xl text-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Approved By</p>
            <p className="text-slate-700">{expense.approved_by}</p>
            {expense.approved_at && (
              <p className="text-xs text-slate-400 mt-0.5">{formatDate(expense.approved_at)}</p>
            )}
          </div>
        )}

        {(isDraft || isDeletable) && (
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            {isDraft && (
              <button
                onClick={handleSubmit}
                disabled={busy}
                className="btn-primary flex-1"
              >
                {busy ? 'Submitting…' : 'Submit for Approval'}
              </button>
            )}
            {isDeletable && (
              <button
                onClick={handleDelete}
                disabled={busy}
                className="btn-secondary flex-1 !text-red-600 hover:!bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar({ expenses }: { expenses: Expense[] }) {
  const byStatus = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + e.amount;
    return acc;
  }, {});
  const pageTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const cards = [
    { label: 'This Page', value: pageTotal },
    { label: 'Pending', value: byStatus['pending'] ?? 0 },
    { label: 'Approved', value: byStatus['approved'] ?? 0 },
    { label: 'Draft', value: byStatus['draft'] ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {cards.map((c, index) => {
        const colors = [
          'bg-[var(--brand-50)] text-[var(--brand-700)]',
          'bg-amber-50 text-amber-700',
          'bg-emerald-50 text-emerald-700',
          'bg-slate-50 text-slate-600',
        ];
        return (
          <div key={c.label} className={`rounded-xl p-4 ${colors[index % colors.length]}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{c.label}</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(c.value)}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MyExpenses() {
  const { navigate, notify } = useApp();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [meta, setMeta] = useState<PageMeta>({
    total: 0, page: 1, page_size: PAGE_SIZE, total_pages: 1,
  });
  const [loading, setLoading] = useState(true);

  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('');
  const [pendingFrom, setPendingFrom] = useState('');
  const [pendingTo, setPendingTo] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    search: '', status: '', dateFrom: '', dateTo: '', page: 1,
  });

  const [selected, setSelected] = useState<Expense | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchExpenses = useCallback(async (filters: typeof appliedFilters) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(filters.page));
      params.set('page_size', String(PAGE_SIZE));
      if (filters.status) params.set('status', filters.status);
      if (filters.dateFrom) params.set('date_from', filters.dateFrom);
      if (filters.dateTo) params.set('date_to', filters.dateTo);

      const raw: unknown = await apiRequest(`/api/v1/expenses/my?${params}`, { method: 'GET' });
      const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object';

      let paginatedData: PaginatedExpenses;
      
      if (isRecord(raw) && 'data' in raw) {
        const envelopeData: unknown = raw.data;
        
        if (isRecord(envelopeData) && 'data' in envelopeData) {
          paginatedData = envelopeData as unknown as PaginatedExpenses;
        } else if (Array.isArray(envelopeData)) {
          paginatedData = {
            data: envelopeData,
            total: envelopeData.length,
            page: filters.page,
            page_size: PAGE_SIZE,
            total_pages: 1
          };
        } else {
          paginatedData = envelopeData as unknown as PaginatedExpenses;
        }
      } else if (Array.isArray(raw)) {
        paginatedData = {
          data: raw,
          total: raw.length,
          page: filters.page,
          page_size: PAGE_SIZE,
          total_pages: 1
        };
      } else {
        paginatedData = {
          data: [],
          total: 0,
          page: 1,
          page_size: PAGE_SIZE,
          total_pages: 1
        };
      }
      
      let rows: Expense[] = Array.isArray(paginatedData.data) ? paginatedData.data : [];

      if (filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        rows = rows.filter(exp =>
          (exp.expense_name?.toLowerCase().includes(q) || false) ||
          (exp.category_name?.toLowerCase().includes(q) || false) ||
          (exp.cost_center_name?.toLowerCase().includes(q) || false) ||
          (exp.expense_no?.toLowerCase().includes(q) || false) ||
          (exp.remarks?.toLowerCase().includes(q) || false) ||
          (exp.reference_number?.toLowerCase().includes(q) || false) ||
          (exp.driver_name?.toLowerCase().includes(q) || false) ||
          (exp.vehicle_no?.toLowerCase().includes(q) || false)
        );
      }

      setExpenses(rows);
      setMeta({
        total: paginatedData.total ?? rows.length,
        page: paginatedData.page ?? 1,
        page_size: paginatedData.page_size ?? PAGE_SIZE,
        total_pages: paginatedData.total_pages ?? 1,
      });
      
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to fetch expenses:', err);
        notify(err.message ?? 'Failed to load expenses', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchExpenses(appliedFilters);
  }, [appliedFilters, fetchExpenses]);

  // ── Filter actions ─────────────────────────────────────────────────────────

  function applyFilters() {
    setAppliedFilters({
      search: pendingSearch,
      status: pendingStatus,
      dateFrom: pendingFrom,
      dateTo: pendingTo,
      page: 1,
    });
  }

  function clearFilters() {
    setPendingSearch('');
    setPendingStatus('');
    setPendingFrom('');
    setPendingTo('');
    setAppliedFilters({ search: '', status: '', dateFrom: '', dateTo: '', page: 1 });
  }

  function goToPage(p: number) {
    setAppliedFilters(prev => ({ ...prev, page: p }));
  }

  const hasActiveFilters = !!(
    appliedFilters.search ||
    appliedFilters.status ||
    appliedFilters.dateFrom ||
    appliedFilters.dateTo
  );

  function pageNumbers(): number[] {
    const total = meta.total_pages;
    const cur = meta.page;
    const start = Math.max(1, Math.min(cur - 2, total - 4));
    return Array.from({ length: Math.min(5, total) }, (_, i) => start + i);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="page-transition">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Expenses</h1>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${meta.total} total entries`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchExpenses(appliedFilters)}
            className="btn-secondary"
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => navigate('expenses/add')} className="btn-primary">
            <PlusCircle size={15} /> New Expense
          </button>
        </div>
      </div>

      {!loading && expenses.length > 0 && <SummaryBar expenses={expenses} />}

      <div className="card p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={pendingSearch}
              onChange={e => setPendingSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              placeholder="Search name, category, ref…"
              className="input pl-9"
            />
          </div>

          <select
            value={pendingStatus}
            onChange={e => setPendingStatus(e.target.value)}
            className="select w-auto"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="on_hold">On Hold</option>
            <option value="needs_clarification">Needs Clarification</option>
            <option value="paid">Paid</option>
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={pendingFrom}
              onChange={e => setPendingFrom(e.target.value)}
              className="input w-auto"
              title="From date"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input
              type="date"
              value={pendingTo}
              onChange={e => setPendingTo(e.target.value)}
              className="input w-auto"
              title="To date"
            />
          </div>

          <button onClick={applyFilters} className="btn-primary" disabled={loading}>
            <Filter size={15} /> Apply
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn-secondary text-slate-500">
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
            {appliedFilters.search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--brand-50)] text-[var(--brand-700)] rounded-full text-xs font-medium">
                Search: "{appliedFilters.search}"
              </span>
            )}
            {appliedFilters.status && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                {appliedFilters.status.charAt(0).toUpperCase() + appliedFilters.status.slice(1).replace('_', ' ')}
              </span>
            )}
            {(appliedFilters.dateFrom || appliedFilters.dateTo) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                {appliedFilters.dateFrom || '…'} → {appliedFilters.dateTo || '…'}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header">Ref / No.</th>
                <th className="table-header">Date</th>
                <th className="table-header">Cost Center</th>
                <th className="table-header">Category / Name</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header">Assignments</th>
                <th className="table-header">Status</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <div className="w-8 h-8 border-2 border-[var(--brand-500)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm">Loading expenses…</p>
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <FileText size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-500 font-medium">
                      {hasActiveFilters ? 'No expenses match your filters' : 'No expenses yet'}
                    </p>
                    {hasActiveFilters ? (
                      <button onClick={clearFilters} className="btn-secondary mt-3 mx-auto text-sm">
                        <X size={13} /> Clear filters
                      </button>
                    ) : (
                      <button onClick={() => navigate('expenses/add')} className="btn-primary mt-3 mx-auto">
                        <PlusCircle size={14} /> Add Expense
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                expenses.map(expense => (
                  <tr
                    key={expense.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => setSelected(expense)}
                  >
                    <td className="table-cell">
                      <span className="font-mono text-xs text-slate-400">
                        {expense.expense_no ?? `#${expense.id.slice(-6).toUpperCase()}`}
                      </span>
                    </td>
                    <td className="table-cell whitespace-nowrap text-sm text-slate-600">
                      {expense.date ? formatDateShort(expense.date) : '—'}
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-medium text-slate-700">
                        {expense.cost_center_name ?? '—'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <p className="text-sm font-semibold text-slate-800 leading-tight">
                        {expense.expense_name ?? '—'}
                      </p>
                      <p className="text-xs text-slate-400 leading-tight mt-0.5">
                        {expense.category_name ?? ''}
                      </p>
                    </td>
                    <td className="table-cell text-right">
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatCurrency(expense.amount)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-col gap-0.5">
                        {(expense.employee_ids?.length ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <Users size={11} />
                            {expense.employee_ids!.length} emp
                          </span>
                        )}
                        {expense.driver_name && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <Truck size={11} />
                            <span className="truncate max-w-24">{expense.driver_name}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={expense.status} />
                    </td>
                    <td className="table-cell" onClick={ev => ev.stopPropagation()}>
                      <button
                        onClick={() => setSelected(expense)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                        title="View details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Page {meta.page} of {meta.total_pages} &nbsp;·&nbsp; {meta.total} total records
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(meta.page - 1)}
                disabled={meta.page <= 1 || loading}
                className="btn-secondary p-1.5 disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              {pageNumbers().map(pg => (
                <button
                  key={pg}
                  onClick={() => goToPage(pg)}
                  disabled={loading}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    pg === meta.page
                      ? 'bg-[var(--brand-500)] text-white'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {pg}
                </button>
              ))}
              <button
                onClick={() => goToPage(meta.page + 1)}
                disabled={meta.page >= meta.total_pages || loading}
                className="btn-secondary p-1.5 disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <ExpenseDetailModal
          expense={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => fetchExpenses(appliedFilters)}
        />
      )}
    </div>
  );
}