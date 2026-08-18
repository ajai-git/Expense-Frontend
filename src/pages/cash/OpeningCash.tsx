import { useEffect, useState, useCallback } from 'react';
import { Plus, Wallet, CheckCircle, AlertCircle, RefreshCw, Building2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
import { useApp } from '../../store/AppContext';
import { mongoDb } from '../../lib/mongoApi';
import { CashSession, CostCenter } from '../../types';

// FIX: Defined a strict type for the database join response to eliminate `any` and `{}` errors
type SessionWithCostCenter = CashSession & {
  cost_centers: { name: string } | null;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function OpeningCash() {
  const { notify, state } = useApp();
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [addCashModal, setAddCashModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null);
  const [saving, setSaving] = useState(false);
  
  // FIX: Explicitly type as string to resolve `const selectedDate: string` TS error
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [form, setForm] = useState({
    cost_center_id: '',
    opening_amount: '',
    given_by: 'Accounts Team',
    received_by: '',
    opening_remarks: '',
  });

  const [addCashForm, setAddCashForm] = useState({ amount: '', remarks: '' });

  // FIX: Wrapped in useCallback to safely use it in the useEffect dependency array 
  // without causing infinite re-renders or missing dependency warnings.
  const fetchSessions = useCallback(async (date: string) => {
    setLoading(true);
    const [sessRes, ccRes] = await Promise.all([
      mongoDb.from<SessionWithCostCenter>('cash_sessions')
        .select('*, cost_centers(name)')
        .eq('business_date', date)
        .order('created_at'),
      mongoDb.from<CostCenter>('cost_centers')
        .select('*')
        .eq('active', true)
        .order('name'),
    ]);

    if (Array.isArray(sessRes.data)) {
      const mappedSessions: CashSession[] = sessRes.data.map((s) => ({
        ...s,
        cost_center_name: s.cost_centers?.name || 'Unknown Cost Center',
      }));
      setSessions(mappedSessions);
    }
    
    if (Array.isArray(ccRes.data)) {
      setCostCenters(ccRes.data);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions(selectedDate);
  }, [selectedDate, fetchSessions]);

  async function createSession() {
    if (!form.cost_center_id || !form.opening_amount) {
      notify('Cost center and opening amount are required', 'error'); 
      return;
    }
    const existing = sessions.find(s => s.cost_center_id === form.cost_center_id);
    if (existing) {
      notify('A cash session already exists for this cost center today', 'error'); 
      return;
    }
    setSaving(true);
    const amount = parseFloat(form.opening_amount);
    const { error } = await mongoDb.from('cash_sessions').insert({
      business_date: selectedDate,
      cost_center_id: form.cost_center_id,
      opening_amount: amount,
      system_balance: amount,
      given_by: form.given_by,
      received_by: form.received_by,
      opening_remarks: form.opening_remarks,
      status: 'open',
    });
    if (error) { 
      notify(error.message, 'error'); 
    } else {
      const { data: newSession } = await mongoDb.from<Pick<CashSession, 'id'>>('cash_sessions')
        .select('id')
        .eq('business_date', selectedDate)
        .eq('cost_center_id', form.cost_center_id)
        .single();

      await mongoDb.from('cash_ledger_transactions').insert({
        cash_session_id: newSession?.id,
        business_date: selectedDate,
        cost_center_id: form.cost_center_id,
        txn_type: 'opening',
        direction: 'credit',
        amount,
        balance_after: amount,
        remarks: `Opening cash: ${form.opening_remarks}`,
        created_by: state.user.name,
      });
      notify('Opening cash session created successfully');
      setModal(false);
      setForm({ cost_center_id: '', opening_amount: '', given_by: 'Accounts Team', received_by: '', opening_remarks: '' });
      fetchSessions(selectedDate);
    }
    setSaving(false);
  }

  async function addAdditionalCash() {
    if (!selectedSession || !addCashForm.amount) return;
    setSaving(true);
    const amount = parseFloat(addCashForm.amount);
    const newBalance = selectedSession.system_balance + amount;
    const { error } = await mongoDb.from('cash_sessions').update({
      additional_cash_amount: (selectedSession.additional_cash_amount || 0) + amount,
      system_balance: newBalance,
      updated_at: new Date().toISOString(),
    }).eq('id', selectedSession.id);
    if (!error) {
      await mongoDb.from('cash_ledger_transactions').insert({
        cash_session_id: selectedSession.id,
        business_date: selectedDate,
        cost_center_id: selectedSession.cost_center_id,
        txn_type: 'additional_cash',
        direction: 'credit',
        amount,
        balance_after: newBalance,
        remarks: addCashForm.remarks || 'Additional cash',
        created_by: state.user.name,
      });
      notify('Additional cash added successfully');
      setAddCashModal(false);
      setAddCashForm({ amount: '', remarks: '' });
      fetchSessions(selectedDate);
    }
    setSaving(false);
  }

  const totalOpening = sessions.reduce((s, x) => s + (x.opening_amount || 0), 0);
  const totalBalance = sessions.reduce((s, x) => s + (x.system_balance || 0), 0);
  const totalExpenses = sessions.reduce((s, x) => s + (x.posted_expense_amount || 0), 0);

  const availableCostCenters = costCenters.filter(cc => !sessions.find(s => s.cost_center_id === cc.id));

  return (
    <div className="page-transition">
      <div className="page-header">
        <div>
          <h1 className="page-title">Opening Cash</h1>
          <p className="page-subtitle">Manage daily cash sessions by cost center</p>
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
          {availableCostCenters.length > 0 && (
            <button onClick={() => setModal(true)} className="btn-primary">
              <Plus size={15} /> Open Cash Session
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Wallet size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Total Opening</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(totalOpening)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Total Spent</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <CheckCircle size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Total Balance</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(totalBalance)}</p>
          </div>
        </div>
      </div>

      {/* Sessions table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Cash Sessions — {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
          <span className="text-sm text-slate-500">{sessions.length} sessions</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="table-header">Cost Center</th>
              <th className="table-header">Opening</th>
              <th className="table-header">Additional</th>
              <th className="table-header">Expenses</th>
              <th className="table-header">Balance</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">Loading...</td></tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No cash sessions for this date</p>
                  <p className="text-slate-400 text-sm mt-1">Click "Open Cash Session" to get started</p>
                </td>
              </tr>
            ) : sessions.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <Building2 size={15} className="text-blue-500" />
                    <span className="font-semibold text-slate-800">{s.cost_center_name}</span>
                  </div>
                </td>
                <td className="table-cell font-semibold text-slate-800">{formatCurrency(s.opening_amount)}</td>
                <td className="table-cell text-slate-600">{formatCurrency(s.additional_cash_amount || 0)}</td>
                <td className="table-cell text-red-600 font-medium">{formatCurrency(s.posted_expense_amount || 0)}</td>
                <td className="table-cell">
                  <span className={`font-bold ${s.system_balance < s.opening_amount * 0.2 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {formatCurrency(s.system_balance)}
                  </span>
                </td>
                <td className="table-cell"><StatusBadge status={s.status} /></td>
                <td className="table-cell">
                  {s.status === 'open' && (
                    <button
                      onClick={() => { setSelectedSession(s); setAddCashModal(true); }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Cash
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create session modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Open Cash Session"
        size="md"
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={createSession} disabled={saving} className="btn-primary">
              {saving ? 'Creating...' : 'Submit Opening Cash'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Cost Center *</label>
            <select className="select" value={form.cost_center_id} onChange={e => setForm(p => ({ ...p, cost_center_id: e.target.value }))}>
              <option value="">Select cost center</option>
              {availableCostCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Opening Amount (₹) *</label>
            <input
              type="number"
              className="input"
              placeholder="0.00"
              value={form.opening_amount}
              onChange={e => setForm(p => ({ ...p, opening_amount: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Given By</label>
              <input className="input" value={form.given_by} onChange={e => setForm(p => ({ ...p, given_by: e.target.value }))} />
            </div>
            <div>
              <label className="label">Received By</label>
              <input className="input" placeholder="Name" value={form.received_by} onChange={e => setForm(p => ({ ...p, received_by: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea className="input resize-none" rows={2} value={form.opening_remarks} onChange={e => setForm(p => ({ ...p, opening_remarks: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Add cash modal */}
      <Modal
        open={addCashModal}
        onClose={() => setAddCashModal(false)}
        title={`Additional Cash — ${selectedSession?.cost_center_name}`}
        size="sm"
        footer={
          <>
            <button onClick={() => setAddCashModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={addAdditionalCash} disabled={saving} className="btn-primary">
              {saving ? 'Adding...' : 'Add Cash'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-700">Current Balance: <span className="font-bold">{formatCurrency(selectedSession?.system_balance ?? 0)}</span></p>
          </div>
          <div>
            <label className="label">Amount (₹) *</label>
            <input
              type="number"
              className="input"
              placeholder="0.00"
              value={addCashForm.amount}
              onChange={e => setAddCashForm(p => ({ ...p, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Remarks</label>
            <input className="input" value={addCashForm.remarks} onChange={e => setAddCashForm(p => ({ ...p, remarks: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}