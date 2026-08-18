import React, { useEffect, useState } from 'react';
import {
  Download, Filter, RefreshCw, TrendingUp, Wallet,
  Tags, Users, Truck, Building2, Calendar
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge';
import { useApp } from '../../store/AppContext';
import { apiRequest } from '../../lib/api';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

type ReportTab = 'daily' | 'cash-balance' | 'category' | 'employee-food' | 'driver';

const TABS: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
  { id: 'daily', label: 'Daily Expense', icon: <TrendingUp size={15} /> },
  { id: 'cash-balance', label: 'Cash Balance', icon: <Wallet size={15} /> },
  { id: 'category', label: 'Category-wise', icon: <Tags size={15} /> },
  { id: 'employee-food', label: 'Employee Food', icon: <Users size={15} /> },
  { id: 'driver', label: 'Driver Expense', icon: <Truck size={15} /> },
];

function SimpleBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map(d => (
        <div key={d.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-600 truncate flex-1 mr-3">{d.label}</span>
            <span className="text-sm font-bold text-slate-800 flex-shrink-0">{formatCurrency(d.value)}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExpenseSummary {
  id: string;
  expense_no: string;
  business_date: string;
  cost_center_id: string;
  cost_center_name: string;
  category_id: string;
  category_name: string;
  expense_name_id: string;
  expense_name: string;
  amount: number;
  status: string;
  entered_by: string;
  employee_assignments?: EmployeeAssignment[];
  driver_name?: string;
  vehicle_no?: string;
}

interface EmployeeAssignment {
  employeeId: string;
  employeeName: string;
  shareAmount: number;
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function Reports() {
  const { state, notify } = useApp();
  const [activeTab, setActiveTab] = useState<ReportTab>('daily');
  const [expenses, setExpenses] = useState<ExpenseSummary[]>([]);
  const [sessions, setSessions] = useState<CashSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Set active tab from navigation if coming from nav click
  useEffect(() => {
    const mapping: Record<string, ReportTab> = {
      'reports/daily': 'daily',
      'reports/cash-balance': 'cash-balance',
      'reports/category': 'category',
      'reports/employee-food': 'employee-food',
      'reports/driver': 'driver',
    };
    if (mapping[state.currentPage]) setActiveTab(mapping[state.currentPage]);
  }, [state.currentPage]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      // Fetch expense summary from backend
      const expenseResponse = await apiRequest(
        `/api/v1/reports/expense-summary?date_from=${dateFrom}&date_to=${dateTo}`,
        { method: 'GET' }
      );
      
      console.log('Expense Summary Response:', expenseResponse);
      
      // Unwrap the response
      let expenseData = expenseResponse;
      if (expenseResponse && typeof expenseResponse === 'object') {
        if ('data' in expenseResponse) {
          expenseData = expenseResponse.data;
        }
        if ('result' in expenseResponse) {
          expenseData = expenseResponse.result;
        }
      }
      
      // Extract the data array
      let expensesList: ExpenseSummary[] = [];
      if (expenseData && typeof expenseData === 'object') {
        const expenseObj = expenseData as { data?: unknown };
        if (Array.isArray(expenseData)) {
          expensesList = expenseData;
        } else if (Array.isArray(expenseObj.data)) {
          expensesList = expenseObj.data;
        }
      }
      
      console.log('Expenses List:', expensesList);
      setExpenses(expensesList);

      // Fetch cash sessions from backend
      const sessionResponse = await apiRequest(
        `/api/v1/reports/cash-sessions?date_from=${dateFrom}&date_to=${dateTo}`,
        { method: 'GET' }
      );
      
      console.log('Cash Sessions Response:', sessionResponse);
      
      // Unwrap the response
      let sessionData = sessionResponse;
      if (sessionResponse && typeof sessionResponse === 'object') {
        if ('data' in sessionResponse) {
          sessionData = sessionResponse.data;
        }
        if ('result' in sessionResponse) {
          sessionData = sessionResponse.result;
        }
      }
      
      // Extract the data array
      let sessionsList: CashSessionSummary[] = [];
      if (sessionData && typeof sessionData === 'object') {
        const sessionObj = sessionData as { data?: unknown };
        if (Array.isArray(sessionData)) {
          sessionsList = sessionData;
        } else if (Array.isArray(sessionObj.data)) {
          sessionsList = sessionObj.data;
        }
      }
      
      console.log('Sessions List:', sessionsList);
      setSessions(sessionsList);

    } catch (error) {
      console.error('Failed to load reports:', error);
      notify('Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, notify]);

  useEffect(() => { loadData(); }, [loadData]);

  // Aggregations
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const postedAmount = expenses.filter(e => e.status === 'posted' || e.status === 'closed' || e.status === 'approved').reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const catBreakdown: Record<string, number> = {};
  expenses.forEach(e => { catBreakdown[e.category_name] = (catBreakdown[e.category_name] || 0) + e.amount; });
  const CAT_COLORS: Record<string, string> = {
    'Food & Beverages': '#10B981', 'Vehicle & Transport': '#F59E0B',
    'Maintenance': '#EF4444', 'Office Supplies': '#3B82F6',
    'Utilities': '#8B5CF6', 'Miscellaneous': '#6B7280',
  };
  const catData = Object.entries(catBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: CAT_COLORS[label] ?? '#6B7280' }));

  // Daily breakdown
  const dailyBreakdown: Record<string, number> = {};
  expenses.forEach(e => {
    const d = e.business_date;
    dailyBreakdown[d] = (dailyBreakdown[d] || 0) + e.amount;
  });
  const dailyData = Object.entries(dailyBreakdown)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({
      label: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      value,
      color: '#3B82F6',
    }));

  // Cost center breakdown
  const ccBreakdown: Record<string, number> = {};
  expenses.forEach(e => { 
    ccBreakdown[e.cost_center_name || 'Unknown'] = (ccBreakdown[e.cost_center_name || 'Unknown'] || 0) + e.amount; 
  });
  const ccData = Object.entries(ccBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: '#3B82F6' }));

  // Employee food
  const empFood = expenses.filter(e => e.employee_assignments && e.employee_assignments.length > 0);
  const empBreakdown: Record<string, number> = {};
  empFood.forEach(e => {
    e.employee_assignments?.forEach(ea => {
      empBreakdown[ea.employeeName] = (empBreakdown[ea.employeeName] || 0) + ea.shareAmount;
    });
  });
  const empData = Object.entries(empBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: '#10B981' }));

  // Driver
  const driverExpenses = expenses.filter(e => e.driver_name);
  const driverBreakdown: Record<string, number> = {};
  driverExpenses.forEach(e => {
    if (e.driver_name) driverBreakdown[e.driver_name] = (driverBreakdown[e.driver_name] || 0) + e.amount;
  });
  const driverData = Object.entries(driverBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: '#F59E0B' }));

  return (
    <div className="page-transition">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Analyze expense data across cost centers</p>
        </div>
        <button className="btn-secondary" onClick={() => {}}>
          <Download size={15} /> Export
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-wrap items-center gap-3">
        <Calendar size={16} className="text-slate-400" />
        <div className="flex items-center gap-2">
          <input type="date" className="input w-auto" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" className="input w-auto" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <button onClick={loadData} className="btn-primary" disabled={loading}>
          {loading ? <RefreshCw size={15} className="animate-spin" /> : <Filter size={15} />}
          {loading ? ' Loading...' : ' Apply'}
        </button>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <div className="text-center">
            <p className="font-bold text-slate-900">{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-slate-400">Total</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-emerald-700">{formatCurrency(postedAmount)}</p>
            <p className="text-xs text-slate-400">Posted</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-900">{expenses.length}</p>
            <p className="text-xs text-slate-400">Entries</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <RefreshCw size={24} className="animate-spin mr-3" /> Loading...
        </div>
      ) : (
        <div>
          {/* Daily Report */}
          {activeTab === 'daily' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card p-5">
                  <h3 className="font-semibold text-slate-800 mb-4">Daily Trend</h3>
                  {dailyData.length > 0 ? <SimpleBarChart data={dailyData} /> : <p className="text-slate-400 text-sm">No data for selected period</p>}
                </div>
                <div className="card p-5">
                  <h3 className="font-semibold text-slate-800 mb-4">Summary by Cost Center</h3>
                  {ccData.length > 0 ? <SimpleBarChart data={ccData} /> : <p className="text-slate-400 text-sm">No data</p>}
                </div>
              </div>
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800">All Expenses</h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="table-header">Date</th>
                      <th className="table-header">No.</th>
                      <th className="table-header">Cost Center</th>
                      <th className="table-header">Expense</th>
                      <th className="table-header">Amount</th>
                      <th className="table-header">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.slice(0, 50).map(e => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="table-cell text-sm">{new Date(e.business_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                        <td className="table-cell font-mono text-xs text-slate-400">{e.expense_no}</td>
                        <td className="table-cell text-sm">{e.cost_center_name || '—'}</td>
                        <td className="table-cell">
                          <p className="text-sm font-medium">{e.expense_name || '—'}</p>
                          <p className="text-xs text-slate-400">{e.category_name || ''}</p>
                        </td>
                        <td className="table-cell font-bold text-slate-800">{formatCurrency(e.amount)}</td>
                        <td className="table-cell"><StatusBadge status={e.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cash Balance */}
          {activeTab === 'cash-balance' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card p-5">
                  <h3 className="font-semibold text-slate-800 mb-4">Balance by Cost Center</h3>
                  {sessions.length > 0 ? (
                    <SimpleBarChart
                      data={sessions.reduce<{ label: string; value: number; color: string }[]>((acc, s) => {
                        const existing = acc.find(a => a.label === s.cost_center_name);
                        if (existing) existing.value += s.system_balance;
                        else acc.push({ label: s.cost_center_name || 'Unknown', value: s.system_balance, color: '#3B82F6' });
                        return acc;
                      }, [])}
                    />
                  ) : (
                    <p className="text-slate-400 text-sm">No cash session data</p>
                  )}
                </div>
                <div className="card p-5">
                  <h3 className="font-semibold text-slate-800 mb-4">Cash Session Summary</h3>
                  <div className="space-y-3">
                    {sessions.slice(0, 8).map(s => (
                      <div key={s.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                        <Building2 size={15} className="text-blue-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{s.cost_center_name || 'Unknown'}</p>
                          <p className="text-xs text-slate-400">{new Date(s.business_date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-700">{formatCurrency(s.system_balance)}</p>
                          <p className="text-xs text-slate-400">of {formatCurrency(s.opening_amount)}</p>
                        </div>
                        <StatusBadge status={s.status} />
                      </div>
                    ))}
                    {sessions.length === 0 && <p className="text-slate-400 text-sm">No cash sessions found</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category Report */}
          {activeTab === 'category' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Category Breakdown</h3>
                {catData.length > 0 ? <SimpleBarChart data={catData} /> : <p className="text-slate-400 text-sm">No data</p>}
              </div>
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Category Detail</h3>
                <div className="space-y-2">
                  {catData.map(d => (
                    <div key={d.label} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-sm font-medium text-slate-700">{d.label}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                  {catData.length === 0 && <p className="text-slate-400 text-sm">No category data</p>}
                </div>
              </div>
            </div>
          )}

          {/* Employee Food */}
          {activeTab === 'employee-food' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800 mb-1">Employee Food Expense</h3>
                <p className="text-sm text-slate-500 mb-4">Per-head food cost by employee</p>
                {empData.length > 0 ? <SimpleBarChart data={empData} /> : <p className="text-slate-400 text-sm">No employee food data</p>}
              </div>
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Food Expense Entries</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {empFood.map(e => (
                    <div key={e.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-800">{e.expense_name}</span>
                        <span className="text-sm font-bold text-emerald-700">{formatCurrency(e.amount)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {e.employee_assignments?.map((ea, i) => (
                          <span key={i} className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-600">
                            {ea.employeeName} ({formatCurrency(ea.shareAmount)})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {empFood.length === 0 && <p className="text-slate-400 text-sm">No food expense data</p>}
                </div>
              </div>
            </div>
          )}

          {/* Driver Report */}
          {activeTab === 'driver' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Driver-wise Expense</h3>
                {driverData.length > 0 ? <SimpleBarChart data={driverData} /> : <p className="text-slate-400 text-sm">No driver expense data</p>}
              </div>
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Driver Transactions</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {driverExpenses.map(e => (
                    <div key={e.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{e.expense_name}</p>
                        <p className="text-xs text-slate-500">
                          <Truck size={11} className="inline mr-1" />{e.driver_name}
                          {e.vehicle_no && ` — ${e.vehicle_no}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-700">{formatCurrency(e.amount)}</p>
                        <StatusBadge status={e.status} />
                      </div>
                    </div>
                  ))}
                  {driverExpenses.length === 0 && <p className="text-slate-400 text-sm">No driver expense data</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}