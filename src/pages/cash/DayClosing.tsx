import { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, CheckCircle, AlertTriangle, Lock, RefreshCw, Building2 } from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge';
import { useApp } from '../../store/AppContext';
import { mongoDb } from '../../lib/mongoApi';
import { CashSession, ExpenseEntry } from '../../types';

// Type for the joined response from the database
type SessionWithCostCenter = CashSession & {
  cost_centers: { name: string } | null;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

interface ClosingPanelProps {
  session: CashSession;
  onRefresh: () => void;
}

function ClosingPanel({ session, onRefresh }: ClosingPanelProps) {
  const { notify, state } = useApp();
  const [physicalCash, setPhysicalCash] = useState('');
  const [remarks, setRemarks] = useState('');
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadExpenses() {
      const { data } = await mongoDb
        .from<ExpenseEntry>('expense_entries')
        .select('*')
        .eq('cash_session_id', session.id)
        .neq('status', 'cancelled')
        .order('created_at');
        
      if (data) {
        setExpenses(Array.isArray(data) ? data : [data]);
      }
    }

    loadExpenses();
  }, [session.id]);

  const physical = parseFloat(physicalCash) || 0;
  const variance = physical - session.system_balance;
  const hasVariance = Math.abs(variance) > 0.01;

  async function submitClosing() {
    if (!physicalCash) {
      notify('Please enter physical cash amount', 'error');
      return;
    }
    
    if (hasVariance && !remarks.trim()) {
      notify('Remarks are mandatory when variance exists', 'error');
      return;
    }

    setSubmitting(true);

    const { error } = await mongoDb
      .from('cash_sessions')
      .update({
        physical_cash: physical,
        variance_amount: variance,
        closing_remarks: remarks,
        status: 'closing_submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (!error) {
      if (hasVariance) {
        await mongoDb.from('cash_ledger_transactions').insert({
          cash_session_id: session.id,
          business_date: session.business_date,
          cost_center_id: session.cost_center_id,
          txn_type: 'variance',
          direction: variance > 0 ? 'credit' : 'debit',
          amount: Math.abs(variance),
          balance_after: physical,
          remarks: `Closing variance: ${remarks}`,
          created_by: state.user.name,
        });
      }
      notify(`Day closing submitted for ${session.cost_center_name}`);
      onRefresh();
    } else {
      notify(error.message, 'error');
    }
    
    setSubmitting(false);
  }

  async function lockDay() {
    const { error } = await mongoDb
      .from('cash_sessions')
      .update({
        status: 'locked',
        locked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);
      
    if (!error) {
      notify('Day locked successfully');
      onRefresh();
    }
  }

  return (
    <div className="card p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <Building2 size={18} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{session.cost_center_name}</h3>
            <p className="text-xs text-slate-400">{new Date(session.business_date).toLocaleDateString('en-IN')}</p>
          </div>
        </div>
        <StatusBadge status={session.status} size="md" />
      </div>

      {/* Calculation Summary */}
      <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
        {[
          { label: 'Opening Cash', value: session.opening_amount, color: '' },
          { label: '+ Additional Cash', value: session.additional_cash_amount, color: 'text-emerald-600' },
          { label: '- Approved Expenses', value: session.posted_expense_amount, color: 'text-red-600' },
          { label: '- Cash Returned', value: session.cash_returned_amount, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-slate-600">{label}</span>
            <span className={`text-sm font-semibold ${color || 'text-slate-800'}`}>
              {formatCurrency(value || 0)}
            </span>
          </div>
        ))}
        <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">System Balance</span>
          <span className="text-base font-bold text-slate-900">{formatCurrency(session.system_balance)}</span>
        </div>
      </div>

      {/* Dynamic Content based on Status */}
      {(session.status === 'open' || session.status === 'reopened') ? (
        <div className="space-y-4">
          <div>
            <label className="label">Physical Cash Count (₹) *</label>
            <input
              type="number"
              className="input text-lg font-semibold"
              placeholder="Enter physical cash"
              value={physicalCash}
              onChange={e => setPhysicalCash(e.target.value)}
            />
          </div>

          {physicalCash && (
            <div className={`p-3 rounded-xl flex items-center gap-3 ${
              hasVariance ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'
            }`}>
              {hasVariance ? (
                <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
              ) : (
                <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
              )}
              <div>
                <p className={`text-sm font-semibold ${hasVariance ? 'text-amber-800' : 'text-emerald-800'}`}>
                  Variance: {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                  {!hasVariance && ' (No Variance)'}
                </p>
                {hasVariance && (
                  <p className="text-xs text-amber-600">
                    {variance > 0 ? 'Excess cash' : 'Shortage'} — remarks required
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="label">
              Closing Remarks {hasVariance && <span className="text-red-500">*</span>}
            </label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder={hasVariance ? "Explain the variance (mandatory)" : "Optional remarks"}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>

          {expenses.length > 0 && (
            <div>
              <p className="label mb-2">Today's Expense Preview ({expenses.length} entries)</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {expenses.map(e => (
                  <div key={e.id} className="flex items-center justify-between py-1 px-2 rounded bg-slate-50 text-sm">
                    <span className="text-slate-700">{e.expense_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{formatCurrency(e.amount)}</span>
                      <StatusBadge status={e.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={submitClosing} disabled={submitting} className="btn-primary flex-1 justify-center">
              <CalendarCheck size={15} />
              {submitting ? 'Submitting...' : 'Submit Day Closing'}
            </button>
          </div>
        </div>
      ) : session.status === 'closing_submitted' ? (
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
            <p className="font-semibold">Closing submitted — awaiting verification</p>
            <p>Physical Cash: {formatCurrency(session.physical_cash ?? 0)} | Variance: {formatCurrency(session.variance_amount)}</p>
          </div>
          <button onClick={lockDay} className="btn-success w-full justify-center">
            <Lock size={15} /> Verify & Lock Day
          </button>
        </div>
      ) : session.status === 'locked' ? (
        <div className="p-3 bg-emerald-50 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
          <Lock size={16} />
          <span className="font-semibold">
            Day Locked — {session.locked_at ? new Date(session.locked_at).toLocaleString('en-IN') : ''}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function DayClosing() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);

  // FIX: Wrapped in useCallback to prevent it from recreating on every render,
  // which resolves the exhaustive-deps warning in the useEffect below.
  const fetchSessions = useCallback(async (date: string) => {
    setLoading(true);
    const { data } = await mongoDb
      .from<SessionWithCostCenter>('cash_sessions')
      .select('*, cost_centers(name)')
      .eq('business_date', date)
      .order('created_at');

    if (Array.isArray(data)) {
      const mappedSessions: CashSession[] = data.map((s) => ({
        ...s,
        cost_center_name: s.cost_centers?.name || 'Unknown Cost Center',
      }));
      setSessions(mappedSessions);
    } else {
      setSessions([]);
    }
    setLoading(false);
  }, []);

  // FIX: Now that fetchSessions is stable, we can safely include it in the dependency array
  useEffect(() => {
    fetchSessions(selectedDate);
  }, [selectedDate, fetchSessions]);

  const openSessions = sessions.filter(s => s.status === 'open' || s.status === 'reopened');
  const closedSessions = sessions.filter(s => s.status !== 'open' && s.status !== 'reopened');

  return (
    <div className="page-transition">
      <div className="page-header">
        <div>
          <h1 className="page-title">Day Closing</h1>
          <p className="page-subtitle">Verify physical cash and lock the day</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="input w-auto"
          />
          <button onClick={() => fetchSessions(selectedDate)} className="btn-secondary">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw size={28} className="animate-spin mx-auto mb-3" />
          <p>Loading sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-16">
          <CalendarCheck size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium text-lg">No cash sessions for this date</p>
          <p className="text-slate-400 text-sm mt-1">Open cash sessions to enable day closing</p>
        </div>
      ) : (
        <div>
          {openSessions.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-500" />
                <h2 className="font-semibold text-slate-700">Pending Closing ({openSessions.length})</h2>
              </div>
              {openSessions.map(s => (
                <ClosingPanel key={s.id} session={s} onRefresh={() => fetchSessions(selectedDate)} />
              ))}
            </div>
          )}
          {closedSessions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-emerald-500" />
                <h2 className="font-semibold text-slate-700">Completed ({closedSessions.length})</h2>
              </div>
              {closedSessions.map(s => (
                <ClosingPanel key={s.id} session={s} onRefresh={() => fetchSessions(selectedDate)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}