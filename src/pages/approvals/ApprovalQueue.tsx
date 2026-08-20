import { useEffect, useState } from 'react';
import {
  CheckSquare, XSquare, MessageSquare, Clock, RefreshCw,
  Eye, CheckCircle, Users, Truck, ThumbsUp
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../store/AppContext';
import { api } from '../../lib/api';
import { ExpenseEntry } from '../../types';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function getAge(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ApprovalQueue() {
  const { notify, state } = useApp();
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailExpense, setDetailExpense] = useState<ExpenseEntry | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject' | 'clarify' | 'hold'; expense?: ExpenseEntry } | null>(null);
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadQueue(); }, []);

  // async function loadQueue() {
  //   setLoading(true);
  //   const { data } = await mongoDb.from<ExpenseEntry>('expense_entries')
  //     .select('*')
  //     .in('status', ['pending_approval', 'submitted', 'clarification_required'])
  //     .eq('is_deleted', false)
  //     .order('created_at');
  //   if (data) setExpenses(Array.isArray(data) ? data : [data]);
  //   setLoading(false);
  // }


  // mychanges ----------------------------------*********--------------------------my changes"""
  async function loadQueue() {
    setLoading(true);

    try {
      const data = await api.get<ExpenseEntry[]>(
        '/api/v1/expenses/approvals/pending'
      );

      setExpenses(data ?? []);
    } catch (error) {
      console.error('Approval queue error:', error);
      notify(
        error instanceof Error
          ? error.message
          : 'Failed to load approval queue',
        'error'
      );
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }

  async function processDecision(
    expenseId: string,
    action: 'approve' | 'reject' | 'clarify' | 'hold'
  ) {
    setSubmitting(true);

    try {
      let message = '';

      if (action === 'approve') {
        await api.post(
          `/api/v1/expenses/${expenseId}/approve`,
          {
            action: 'approve',
          }
        );

        message = 'Expense approved successfully';
      }

      if (action === 'reject') {
        await api.post(
          `/api/v1/expenses/${expenseId}/reject`,
          {
            action: 'reject',
            reason: decisionRemarks,
          }
        );

        message = 'Expense rejected';
      }

      if (action === 'hold') {
        await api.post(
          `/api/v1/expenses/${expenseId}/hold`,
          {
            action: 'hold',
            reason: decisionRemarks,
          }
        );

        message = 'Expense put on hold';
      }

      if (action === 'clarify') {
        await api.post(
          `/api/v1/expenses/${expenseId}/clarify`,
          {
            action: 'clarify',
            clarification_note: decisionRemarks,
          }
        );

        message = 'Clarification requested';
      }

      notify(message);

      setActionModal(null);
      setDecisionRemarks('');
      await loadQueue();

    } catch (error) {
      console.error('Approval action error:', error);

      notify(
        error instanceof Error
          ? error.message
          : 'Failed to process expense',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function bulkAction(action: 'approve' | 'reject') {
    for (const id of selected) {
      await processDecision(id, action);
    }
    setSelected(new Set());
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const ACTION_BUTTONS = [
    { action: 'approve' as const, label: 'Approve', icon: <CheckCircle size={14} />, cls: 'btn-success' },
    { action: 'reject' as const, label: 'Reject', icon: <XSquare size={14} />, cls: 'btn-danger' },
    { action: 'clarify' as const, label: 'Clarify', icon: <MessageSquare size={14} />, cls: 'btn-secondary' },
    { action: 'hold' as const, label: 'Hold', icon: <Clock size={14} />, cls: 'btn-secondary' },
  ];

  const pendingCount = expenses.filter(e => e.status === 'pending_approval').length;
  const totalPending = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="page-transition">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approval Queue</h1>
          <p className="page-subtitle">{pendingCount} pending • {formatCurrency(totalPending)} total value</p>
        </div>
        <button onClick={loadQueue} className="btn-secondary">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="card p-4 mb-4 flex items-center gap-3 bg-blue-50 border-blue-200">
          <span className="text-sm font-semibold text-blue-700">{selected.size} selected</span>
          <button onClick={() => bulkAction('approve')} className="btn-success text-xs py-1.5">
            <ThumbsUp size={13} /> Approve All
          </button>
          <button onClick={() => bulkAction('reject')} className="btn-danger text-xs py-1.5">
            <XSquare size={13} /> Reject All
          </button>
          <button onClick={() => setSelected(new Set())} className="btn-secondary text-xs py-1.5 ml-auto">Clear</button>
        </div>
      )}

      {/* Queue table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="table-header w-10">
                <input
                  type="checkbox"
                  checked={selected.size === expenses.length && expenses.length > 0}
                  onChange={e => setSelected(e.target.checked ? new Set(expenses.map(x => x.id)) : new Set())}
                  className="rounded"
                />
              </th>
              <th className="table-header">Date</th>
              <th className="table-header">Cost Center</th>
              <th className="table-header">Expense</th>
              <th className="table-header">Amount</th>
              <th className="table-header">Entered By</th>
              <th className="table-header">Age</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-10 text-slate-400">Loading...</td></tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-14">
                  <CheckSquare size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-600 font-medium">All caught up!</p>
                  <p className="text-slate-400 text-sm">No pending approvals</p>
                </td>
              </tr>
            ) : expenses.map(e => (
              <tr key={e.id} className={`hover:bg-slate-50 transition-colors ${selected.has(e.id) ? 'bg-blue-50' : ''}`}>
                <td className="table-cell">
                  <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} className="rounded" />
                </td>
                <td className="table-cell text-sm text-slate-600">
                  {new Date(e.business_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </td>
                <td className="table-cell">
                  <span className="text-sm font-medium text-slate-700">{e.cost_center_name}</span>
                </td>
                <td className="table-cell">
                  <p className="text-sm font-semibold text-slate-800">{e.expense_name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {e.employee_assignments?.length > 0 && (
                      <span className="text-xs text-emerald-600 flex items-center gap-0.5"><Users size={11} />{e.employee_assignments.length}</span>
                    )}
                    {e.driver_name && (
                      <span className="text-xs text-amber-600 flex items-center gap-0.5"><Truck size={11} />{e.driver_name}</span>
                    )}
                  </div>
                </td>
                <td className="table-cell">
                  <span className={`font-bold ${e.amount >= 2000 ? 'text-red-700' : 'text-slate-800'}`}>
                    {formatCurrency(e.amount)}
                  </span>
                </td>
                <td className="table-cell text-sm text-slate-600">{e.entered_by}</td>
                <td className="table-cell">
                  <span className={`text-xs font-medium ${getAge(e.created_at).includes('d') ? 'text-red-600' : 'text-amber-600'
                    }`}>
                    {getAge(e.created_at)}
                  </span>
                </td>
                <td className="table-cell"><StatusBadge status={e.status} /></td>
                <td className="table-cell">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDetailExpense(e)}
                      className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                      title="View"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={() => { setActionModal({ type: 'approve', expense: e }); setDecisionRemarks(''); }}
                      className="p-1.5 hover:bg-emerald-50 rounded text-emerald-600 transition-colors"
                      title="Approve"
                    >
                      <CheckCircle size={13} />
                    </button>
                    <button
                      onClick={() => { setActionModal({ type: 'reject', expense: e }); setDecisionRemarks(''); }}
                      className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors"
                      title="Reject"
                    >
                      <XSquare size={13} />
                    </button>
                    <button
                      onClick={() => { setActionModal({ type: 'clarify', expense: e }); setDecisionRemarks(''); }}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition-colors"
                      title="Request Clarification"
                    >
                      <MessageSquare size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {detailExpense && (
        <Modal open={true} onClose={() => setDetailExpense(null)} title="Expense Detail" size="lg"
          footer={
            <div className="flex gap-2">
              {ACTION_BUTTONS.map(btn => (
                <button
                  key={btn.action}
                  onClick={() => { setDetailExpense(null); setActionModal({ type: btn.action, expense: detailExpense }); }}
                  className={`${btn.cls} text-xs py-1.5`}
                >
                  {btn.icon} {btn.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Expense', detailExpense.expense_name],
                ['Category', detailExpense.category_name],
                ['Amount', formatCurrency(detailExpense.amount)],
                ['Cost Center', detailExpense.cost_center_name],
                ['Date', new Date(detailExpense.business_date).toLocaleDateString('en-IN')],
                ['Entered By', detailExpense.entered_by],
              ].map(([l, v]) => (
                <div key={l} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">{l}</p>
                  <p className="text-slate-800 font-semibold mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {detailExpense.remarks && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Remarks</p>
                <p className="text-slate-700">{detailExpense.remarks}</p>
              </div>
            )}
            {detailExpense.employee_assignments?.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Employees ({detailExpense.employee_assignments.length})</p>
                <div className="flex flex-wrap gap-2">
                  {detailExpense.employee_assignments.map((ea, i) => (
                    <span key={i} className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-medium">
                      {ea.employeeName} — {formatCurrency(ea.shareAmount)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {detailExpense.driver_name && (
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Driver / Vehicle</p>
                <p className="text-slate-800 font-medium">{detailExpense.driver_name} {detailExpense.vehicle_no ? `— ${detailExpense.vehicle_no}` : ''}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Action modal */}
      {actionModal && (
        <Modal
          open={true}
          onClose={() => setActionModal(null)}
          title={
            actionModal.type === 'approve' ? 'Approve Expense' :
              actionModal.type === 'reject' ? 'Reject Expense' :
                actionModal.type === 'clarify' ? 'Request Clarification' : 'Put On Hold'
          }
          size="sm"
          footer={
            <>
              <button onClick={() => setActionModal(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => processDecision(actionModal.expense!.id, actionModal.type)}
                disabled={submitting || (actionModal.type === 'reject' && !decisionRemarks)}
                className={actionModal.type === 'approve' ? 'btn-success' : actionModal.type === 'reject' ? 'btn-danger' : 'btn-primary'}
              >
                {submitting ? 'Processing...' : 'Confirm'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-sm font-semibold text-slate-800">{actionModal.expense?.expense_name}</p>
              <p className="text-slate-500 text-sm">{formatCurrency(actionModal.expense?.amount ?? 0)} — {actionModal.expense?.cost_center_name}</p>
            </div>
            <div>
              <label className="label">
                Remarks {actionModal.type === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder={`Reason for ${actionModal.type}...`}
                value={decisionRemarks}
                onChange={e => setDecisionRemarks(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
