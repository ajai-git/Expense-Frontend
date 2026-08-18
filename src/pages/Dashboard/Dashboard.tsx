import { useEffect, useState, useCallback } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, Clock, 
  ArrowRight, Building2, RefreshCw, PlusCircle, Eye, DollarSign
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/Badge';
import { useApp } from '../../store/AppContext';
import { apiRequest } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  total_expenses: number;
  category_breakdown: CategoryBreakdown[];
  cost_center_breakdown: CostCenterBreakdown[];
  approval_metrics: ApprovalMetrics;
  daily_summary: DailySummary[];
}

interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  total_amount: number;
  count: number;
}

interface CostCenterBreakdown {
  cost_center_id: string;
  cost_center_name: string;
  total_amount: number;
  count: number;
}

interface ApprovalMetrics {
  avg_turnaround_hours: number;
  total_approved: number;
  total_rejected: number;
}

interface DailySummary {
  date: string;
  total_amount: number;
  count: number;
}

interface CashSessionSummary {
  id: string;
  business_date: string;
  cost_center_id: string;
  cost_center_name?: string;
  opening_amount: number;
  system_balance: number;
  posted_expense_amount: number;
  status: string;
}

interface RecentExpense {
  id: string;
  expense_no: string;
  business_date: string;
  cost_center_name: string;
  category_name: string;
  expense_name: string;
  amount: number;
  entered_by: string;
  status: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Beverages': '#10B981',
  'Vehicle & Transport': '#F59E0B',
  'Maintenance': '#EF4444',
  'Office Supplies': '#3B82F6',
  'Utilities': '#8B5CF6',
  'Miscellaneous': '#6B7280',
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(amount);
}

function getColor(categoryName: string): string {
  return CATEGORY_COLORS[categoryName] ?? '#6B7280';
}

/**
 * FIX: Strictly typed helper to safely unwrap messy API responses.
 * Prevents `unknown` type errors and removes the need for duplicate if/else chains.
 */
function extractData<T>(response: unknown): T | null {
  if (!response || typeof response !== 'object') return null;
  const res = response as Record<string, unknown>;
  
  // Check if direct array, or nested under 'data' / 'result'
  const raw = Array.isArray(res) ? res : (res.data ?? res.result);
  
  if (raw && Array.isArray(raw)) return raw as T;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as T;
  return null;
}

// ─── Components ──────────────────────────────────────────────────────────────

function MiniBarChart({ data }: { data: { name: string; amount: number; color: string; percent: number }[] }) {
  return (
    <div className="space-y-2">
      {data.map(item => (
        <div key={item.name}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{item.name}</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.amount)}</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${item.percent}%`, backgroundColor: item.color }}
            />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{item.percent.toFixed(0)}%</p>
        </div>
      ))}
    </div>
  );
}

function CashSessionRow({ session }: { session: CashSessionSummary }) {
  const balancePct = session.opening_amount > 0 ? (session.system_balance / session.opening_amount) * 100 : 0;
  const isLow = balancePct < 20;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="w-7 h-7 bg-blue-50 dark:bg-blue-900/30 rounded-md flex items-center justify-center flex-shrink-0">
        <Building2 size={13} className="text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{session.cost_center_name || 'Unknown'}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isLow ? 'bg-red-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(balancePct, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex-shrink-0">{balancePct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-xs font-bold ${isLow ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
          {formatCurrency(session.system_balance)}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500">of {formatCurrency(session.opening_amount)}</p>
      </div>
      <StatusBadge status={session.status} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Dashboard() {
  const { navigate, notify } = useApp();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [cashSessions, setCashSessions] = useState<CashSessionSummary[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // FIX: Wrapped in useCallback to resolve ESLint missing dependency warning safely
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch all data in parallel
      const [dashboardRes, sessionsRes, expensesRes] = await Promise.all([
        apiRequest(`/api/v1/reports/dashboard?date_from=${dateFrom}&date_to=${today}`, { method: 'GET' }),
        apiRequest(`/api/v1/reports/cash-sessions?date_from=${today}&date_to=${today}`, { method: 'GET' }),
        apiRequest(`/api/v1/expenses/my?page=1&page_size=8`, { method: 'GET' }),
      ]);

      // FIX: Use the strict helper to cleanly unwrap data without type errors or dupe checks
      setDashboardData(extractData<DashboardData>(dashboardRes));
      setCashSessions(extractData<CashSessionSummary[]>(sessionsRes) || []);
      setRecentExpenses(extractData<RecentExpense[]>(expensesRes) || []);

    } catch (error) {
      console.error('Failed to load dashboard:', error);
      notify('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  // FIX: Add loadDashboard to dependency array - it is now stable thanks to useCallback
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Compute KPI values
  const totalOpening = cashSessions.reduce((s, x) => s + (x.opening_amount || 0), 0);
  const totalExpenses = cashSessions.reduce((s, x) => s + (x.posted_expense_amount || 0), 0);
  const totalBalance = cashSessions.reduce((s, x) => s + (x.system_balance || 0), 0);
  const pendingCount = recentExpenses.filter(e => 
    e.status === 'pending_approval' || e.status === 'submitted' || e.status === 'pending'
  ).length;

  // Category breakdown from dashboard data
  const categoryData = (dashboardData?.category_breakdown || [])
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 5)
    .map(item => ({
      name: item.category_name || 'Unknown',
      amount: item.total_amount,
      color: getColor(item.category_name || ''),
      percent: dashboardData?.total_expenses 
        ? (item.total_amount / dashboardData.total_expenses) * 100 
        : 0,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw size={20} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-transition">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Expense Dashboard</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadDashboard} className="btn-secondary">
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={() => navigate('expenses/add')} className="btn-primary">
            <PlusCircle size={12} /> New Expense
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          title="Opening Cash"
          value={formatCurrency(totalOpening)}
          subtitle="Today's total"
          icon={<Wallet size={18} className="text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-50 dark:bg-blue-900/30"
          onClick={() => navigate('cash/opening')}
        />
        <StatCard
          title="Today's Expenses"
          value={formatCurrency(totalExpenses)}
          subtitle={`${recentExpenses.filter(e => e.status === 'posted' || e.status === 'approved').length} posted entries`}
          icon={<TrendingDown size={18} className="text-red-500 dark:text-red-400" />}
          iconBg="bg-red-50 dark:bg-red-900/30"
          onClick={() => navigate('expenses/my')}
        />
        <StatCard
          title="Available Balance"
          value={formatCurrency(totalBalance)}
          subtitle="Across all cost centers"
          icon={<DollarSign size={18} className="text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-50 dark:bg-emerald-900/30"
          onClick={() => navigate('reports/cash-balance')}
        />
        <StatCard
          title="Pending Approvals"
          value={pendingCount}
          subtitle="Require attention"
          icon={<Clock size={18} className="text-amber-500 dark:text-amber-400" />}
          iconBg="bg-amber-50 dark:bg-amber-900/30"
          trend={pendingCount > 0 ? { value: 'Action needed', positive: false } : { value: 'All clear', positive: true }}
          onClick={() => navigate('approvals')}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Category breakdown */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Category Spend</h3>
            <button onClick={() => navigate('reports/category')} className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1">
              View all <ArrowRight size={10} />
            </button>
          </div>
          {categoryData.length > 0 ? (
            <MiniBarChart data={categoryData} />
          ) : (
            <div className="text-center py-6 text-slate-400 dark:text-slate-500">
              <TrendingUp size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs">No expense data yet</p>
            </div>
          )}
        </div>

        {/* Cash by cost center */}
        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Cash Balance by Cost Center</h3>
            <button onClick={() => navigate('cash/opening')} className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1">
              Manage <ArrowRight size={10} />
            </button>
          </div>
          {cashSessions.length > 0 ? (
            <div>
              {cashSessions.map(s => <CashSessionRow key={s.id} session={s} />)}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 dark:text-slate-500">
              <Building2 size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs">No cash sessions for today</p>
              <button onClick={() => navigate('cash/opening')} className="btn-primary mt-2 mx-auto">
                <PlusCircle size={12} /> Open Cash
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent expenses */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Recent Expenses</h3>
          <button onClick={() => navigate('expenses/my')} className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1">
            View all <ArrowRight size={10} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Expense No.</th>
                <th className="table-header">Cost Center</th>
                <th className="table-header">Category / Name</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Entered By</th>
                <th className="table-header">Status</th>
                <th className="table-header">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                    No expenses today. <button onClick={() => navigate('expenses/add')} className="text-blue-600 dark:text-blue-400 hover:underline">Add one now.</button>
                  </td>
                </tr>
              ) : (
                recentExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="table-cell">
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{e.expense_no || `#${e.id.slice(-6)}`}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{e.cost_center_name || '—'}</span>
                    </td>
                    <td className="table-cell">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{e.expense_name || '—'}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{e.category_name || ''}</p>
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{formatCurrency(e.amount)}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-xs text-slate-600 dark:text-slate-400">{e.entered_by || '—'}</span>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="table-cell">
                      <button 
                        onClick={() => navigate(`expenses/${e.id}`)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-[10px] font-medium flex items-center gap-1"
                      >
                        <Eye size={11} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}