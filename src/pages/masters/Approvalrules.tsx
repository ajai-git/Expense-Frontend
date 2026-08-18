import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Loader2, AlertCircle, X, PowerOff, Power } from 'lucide-react';
import { api } from '../../lib/api';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApprovalRule {
  id: string;
  rule_name: string;
  min_amount: number;
  max_amount: number | null;
  approver_role: string;
  sla_hours: number;
  active: boolean;
  priority: number;
  created_at: string;
}

interface ApprovalRuleFormValues {
  rule_name: string;
  min_amount: string;
  max_amount: string;
  approver_role: string;
  sla_hours: string;
  priority: string;
  active: boolean;
}

const EMPTY_FORM: ApprovalRuleFormValues = {
  rule_name: '',
  min_amount: '0',
  max_amount: '',
  approver_role: 'manager',
  sla_hours: '8',
  priority: '10',
  active: true,
};

const APPROVER_ROLES = ['branch_incharge', 'accounts', 'manager', 'owner', 'admin'] as const;
const HIGH_LIMIT_THRESHOLD = 100_000;

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatAmountRange(rule: ApprovalRule): string {
  const min = `₹${rule.min_amount.toLocaleString('en-IN')}`;
  const max =
    rule.max_amount === null || rule.max_amount > HIGH_LIMIT_THRESHOLD
      ? 'No limit'
      : `₹${rule.max_amount.toLocaleString('en-IN')}`;
  return `${min} — ${max}`;
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ');
}

// ─── API Calls ────────────────────────────────────────────────────────────────

async function fetchApprovalRules(): Promise<ApprovalRule[]> {
  // Always fetch all records (active_only=false) to show both in the same table
  return api.get<ApprovalRule[]>('/api/v1/masters/approval-rules?active_only=false');
}

async function createApprovalRule(values: ApprovalRuleFormValues): Promise<ApprovalRule> {
  return api.post<ApprovalRule>('/api/v1/masters/approval-rules', {
    rule_name: values.rule_name.trim(),
    cost_center_ids: [],
    category_ids: [],
    min_amount: Number(values.min_amount) || 0,
    max_amount: values.max_amount.trim() === '' ? null : Number(values.max_amount),
    approver_role: values.approver_role,
    sla_hours: Number(values.sla_hours) || 1,
    priority: Number(values.priority) || 10,
  });
}

async function updateApprovalRule(id: string, values: ApprovalRuleFormValues): Promise<ApprovalRule> {
  return api.patch<ApprovalRule>(`/api/v1/masters/approval-rules/${id}`, {
    rule_name: values.rule_name.trim(),
    min_amount: Number(values.min_amount) || 0,
    max_amount: values.max_amount.trim() === '' ? null : Number(values.max_amount),
    approver_role: values.approver_role,
    sla_hours: Number(values.sla_hours) || 1,
    active: values.active,
    priority: Number(values.priority) || 10,
  });
}

async function setApprovalRuleActive(id: string, active: boolean): Promise<ApprovalRule> {
  return api.patch<ApprovalRule>(`/api/v1/masters/approval-rules/${id}`, { active });
}

// ─── Fetch State ──────────────────────────────────────────────────────────────

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: ApprovalRule[] };

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ApprovalRules() {
  const [state, setState] = useState<FetchState>({ status: 'loading' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [rowActionId, setRowActionId] = useState<string | null>(null);
  const [rowActionError, setRowActionError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active');
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ApprovalRule | null>(null);


  const loadRules = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await fetchApprovalRules();
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Could not load approval rules.',
      });
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const openCreateDialog = () => {
    setEditingRule(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: ApprovalRule) => {
    setEditingRule(rule);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRule(null);
  };

  const handleSaved = () => {
    closeDialog();
    loadRules();
  };

  const handleToggleActive = async (rule: ApprovalRule) => {
    setRowActionId(rule.id);
    setRowActionError(null);
    try {
      await setApprovalRuleActive(rule.id, !rule.active);
      await loadRules();
    } catch (err) {
      setRowActionError(err instanceof Error ? err.message : 'Could not update the rule.');
    } finally {
      setRowActionId(null);
    }
  };

  const statusFiltered =
    state.status === 'success'
      ? state.data.filter(rule =>
        statusFilter === 'active'
          ? rule.active
          : !rule.active
      )
      : [];

  const sortedRules = [...statusFiltered].sort(
    (a, b) => a.priority - b.priority
  );

  return (
    <div className="page-transition">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approval Rules</h1>
          <p className="page-subtitle">Configure amount-based approval routing</p>
        </div>

        <div className="flex items-center gap-2">

          {/* Active / Deactive Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={statusFilter === 'active'}
              onClick={() =>
                setStatusFilter(
                  statusFilter === 'active' ? 'inactive' : 'active'
                )
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${statusFilter === 'active'
                ? 'bg-[var(--brand-600)]'
                : 'bg-slate-300'
                }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${statusFilter === 'active'
                  ? 'translate-x-5'
                  : 'translate-x-0'
                  }`}
              />
            </button>

            <span className="text-sm font-medium text-slate-600">
              {statusFilter === 'active' ? 'Active' : 'Deactive'}
            </span>
          </div>

          {/* Add Rule */}
          <button
            type="button"
            className="btn-primary"
            onClick={openCreateDialog}
          >
            <Plus size={16} />
            Add rule
          </button>

        </div>
      </div>

      {rowActionError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={14} className="flex-shrink-0" />
          {rowActionError}
        </div>
      )}

      <div className="card overflow-hidden">
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState message={state.message} onRetry={loadRules} />}
        {state.status === 'success' && (
          <table className="w-full" aria-label="Approval rules by amount range">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header" scope="col">Priority</th>
                <th className="table-header" scope="col">Rule Name</th>
                <th className="table-header" scope="col">Amount Range</th>
                <th className="table-header" scope="col">Approver Role</th>
                <th className="table-header" scope="col">SLA (Hours)</th>
                <th className="table-header" scope="col">Status</th>
                <th className="table-header text-right" scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedRules.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-sm text-slate-400"
                  >
                    No approval rules found
                  </td>
                </tr>
              ) : (
                sortedRules.map((rule) => (
                  <tr
                    key={rule.id}
                    className={`border-b border-slate-50 last:border-0 transition-colors
                    ${rule.active ? 'hover:bg-slate-50' : 'bg-slate-50/60 hover:bg-slate-100/60'}`}
                  >
                    <td className="table-cell tabular-nums text-xs text-slate-400">
                      {rule.priority}
                    </td>
                    <td className="table-cell">
                      <span className={`text-sm font-semibold ${rule.active ? 'text-slate-800' : 'text-slate-400 line-through decoration-slate-300'}`}>
                        {rule.rule_name}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-slate-600 tabular-nums">
                      {formatAmountRange(rule)}
                    </td>
                    <td className="table-cell">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize">
                        {formatRole(rule.approver_role)}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-slate-600 tabular-nums">
                      {rule.sla_hours}h
                    </td>
                    <td className="table-cell">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${rule.active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'
                          }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${rule.active
                            ? 'bg-emerald-500'
                            : 'bg-red-500'
                            }`}
                        />

                        {rule.active ? 'Active' : 'Deactive'}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">

                        {/* Edit Button */}

                        {rule.active && (
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEditDialog(rule)}
                            className="cc-action-btn group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:shadow-md"
                          >
                            <Pencil size={13} strokeWidth={2} />

                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                              Edit
                            </span>
                          </button>
                        )}

                        {/* Deactivate / Activate Button */}
                        <button
                          type="button"
                          title={rule.active ? 'Deactivate' : 'Activate'}
                          onClick={() => {
                            setSelectedRule(rule);
                            setConfirmToggle(true);
                          }}
                          disabled={rowActionId === rule.id}
                          className={`cc-action-btn group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-all hover:shadow-md disabled:pointer-events-none disabled:opacity-50
                          ${rule.active
                              ? 'border-red-200 bg-white text-red-400'
                              : 'border-emerald-200 bg-white text-emerald-500'
                            }`}
                        >
                          {rowActionId === rule.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : rule.active ? (
                            <PowerOff size={13} strokeWidth={2} />
                          ) : (
                            <Power size={13} strokeWidth={2} />
                          )}
                          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                            {rule.active ? 'Deactivate' : 'Activate'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
                ))
              }
            </tbody>
          </table>
        )}
      </div>

      {isDialogOpen && (
        <ApprovalRuleDialog
          rule={editingRule}
          onClose={closeDialog}
          onSaved={handleSaved}
        />
      )}
      <ConfirmDialog
        open={confirmToggle}
        onClose={() => {
          setConfirmToggle(false);
          setSelectedRule(null);
        }}
        onConfirm={async () => {
          if (!selectedRule) return;

          setRowActionId(selectedRule.id);
          setConfirmToggle(false);

          try {
            await setApprovalRuleActive(
              selectedRule.id,
              !selectedRule.active
            );

            await loadRules();
          } catch (err) {
            setRowActionError(
              err instanceof Error
                ? err.message
                : 'Could not update the rule.'
            );
          } finally {
            setRowActionId(null);
            setSelectedRule(null);
          }
        }}
        title={
          selectedRule?.active
            ? 'Confirm Deactivation'
            : 'Confirm Activation'
        }
        confirmText={
          selectedRule?.active
            ? 'Deactivate'
            : 'Activate'
        }
        message={
          <>
            Are you sure you want to{' '}
            <strong>
              {selectedRule?.active
                ? 'deactivate'
                : 'activate'}
            </strong>{' '}
            the approval rule{' '}
            <strong>{selectedRule?.rule_name}</strong>?
          </>
        }
      />

    </div>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

function ApprovalRuleDialog({
  rule,
  onClose,
  onSaved,
}: {
  rule: ApprovalRule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = rule !== null;

  const [values, setValues] = useState<ApprovalRuleFormValues>(
    rule
      ? {
        rule_name: rule.rule_name,
        min_amount: String(rule.min_amount),
        max_amount: rule.max_amount === null ? '' : String(rule.max_amount),
        approver_role: rule.approver_role,
        sla_hours: String(rule.sla_hours),
        priority: String(rule.priority),
        active: rule.active,
      }
      : EMPTY_FORM
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById('rule_name')?.focus();
    }, 0);

    return () => clearTimeout(timer);
  }, []);


  const handleUpdateConfirm = async () => {
    if (!rule) return;

    setConfirmUpdate(false);
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await updateApprovalRule(rule.id, values);
      onSaved();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Could not update the rule.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const focusNext = (id: string) => {
    document.getElementById(id)?.focus();
  };

  const handleEnter = (
    e: React.KeyboardEvent,
    nextId: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      focusNext(nextId);
    }
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!values.rule_name.trim()) {
      setSubmitError('Rule name is required.');
      return;
    }
    const min = Number(values.min_amount);
    const max = values.max_amount.trim() === '' ? null : Number(values.max_amount);
    if (Number.isNaN(min) || min < 0) {
      setSubmitError('Minimum amount must be zero or a positive number.');
      return;
    }
    if (max !== null && (Number.isNaN(max) || max <= min)) {
      setSubmitError('Maximum amount must be greater than the minimum.');
      return;
    }
    const sla = Number(values.sla_hours);
    if (Number.isNaN(sla) || sla < 1) {
      setSubmitError('SLA must be at least 1 hour.');
      return;
    }

    if (isEditing) {
      setConfirmUpdate(true);
      return;
    }

    setIsSubmitting(true);

    try {
      await createApprovalRule(values);
      onSaved();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Could not create the rule.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnterNavigation = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>
  ) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();

    const form = e.currentTarget.form;
    if (!form) return;

    const focusable = Array.from(
      form.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), button:not([disabled])'
      )
    ).filter((el) => {
      const type = el.getAttribute('type');
      return type !== 'hidden' && el.tabIndex !== -1;
    });

    const currentIndex = focusable.indexOf(e.currentTarget);

    if (currentIndex === -1) return;

    const nextElement = focusable[currentIndex + 1];

    if (nextElement) {
      nextElement.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-rule-dialog-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cc-dialog w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="cc-dialog-icon flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-50)]">
              <Plus size={15} className="text-[var(--brand-600)]" />
            </div>
            <h2 id="approval-rule-dialog-title" className="text-sm font-semibold text-slate-800">
              {isEditing ? 'Edit approval rule' : 'Add approval rule'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="cc-close-btn flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={15} />
          </button>
        </div>

        {submitError && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <AlertCircle size={14} className="mt-px flex-shrink-0" />
            {submitError}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); }}
          className="space-y-4 px-6 py-5"
        >
          <div>
            <label className="label" htmlFor="rule_name">Rule name *</label>
            <input
              id="rule_name"
              className="input"
              value={values.rule_name}
              onChange={(e) =>
                setValues((v) => ({ ...v, rule_name: e.target.value }))
              }
              onKeyDown={(e) => handleEnter(e, 'min_amount')}
              placeholder="e.g. Manager Approval"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="min_amount">Min amount (₹)</label>
              <input
                id="min_amount"
                type="number"
                min="0"
                step="1"
                className="input"
                value={values.min_amount}
                onChange={(e) =>
                  setValues((v) => ({ ...v, min_amount: e.target.value }))
                }
                onKeyDown={(e) => handleEnter(e, 'max_amount')}
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="label" htmlFor="max_amount">
                Max amount (₹)
                <span className="ml-1 font-normal text-slate-400">optional</span>
              </label>
              <input
                id="max_amount"
                type="number"
                min="0"
                step="1"
                className="input"
                placeholder="No limit"
                value={values.max_amount}
                onChange={(e) =>
                  setValues((v) => ({ ...v, max_amount: e.target.value }))
                }
                onKeyDown={(e) => handleEnter(e, 'approver_role')}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="approver_role">Approver role</label>
              <select
                id="approver_role"
                className="select capitalize"
                value={values.approver_role}
                onChange={(e) =>
                  setValues((v) => ({ ...v, approver_role: e.target.value }))
                }
                onKeyDown={(e) => handleEnter(e, 'sla_hours')}
                disabled={isSubmitting}
              >
                {APPROVER_ROLES.map((role) => (
                  <option key={role} value={role} className="capitalize">
                    {formatRole(role)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="sla_hours">SLA (hours)</label>
              <input
                id="sla_hours"
                type="number"
                min="1"
                step="1"
                className="input"
                value={values.sla_hours}
                onChange={(e) =>
                  setValues((v) => ({ ...v, sla_hours: e.target.value }))
                }
                onKeyDown={(e) => handleEnter(e, 'priority')}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="priority">
              Priority
              <span className="ml-1 font-normal text-slate-400">(lower runs first)</span>
            </label>
            <input
              id="priority"
              type="number"
              min="1"
              step="1"
              className="input"
              value={values.priority}
              onChange={(e) =>
                setValues((v) => ({ ...v, priority: e.target.value }))
              }
             onKeyDown={(e) => handleEnter(e, 'create-rule')}
              disabled={isSubmitting}
            />
          </div>

          {/* Toggle - Only show if editing, otherwise implicitly active */}
          {!isEditing && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              New rules will be created as <strong>Active</strong> by default.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              id="create-rule"
              type="button"
              className="btn-primary min-w-[100px]"
              disabled={isSubmitting}
              onClick={() => {
                handleSubmit({
                  preventDefault: () => { },
                } as FormEvent);
              }}
            >
              {isSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : isEditing ? (
                'Update rule'
              ) : (
                'Create rule'
              )}
            </button>
          </div>
        </form>
        <ConfirmDialog
          open={confirmUpdate}
          onClose={() => setConfirmUpdate(false)}
          onConfirm={handleUpdateConfirm}
          title="Confirm Update"
          confirmText="Update Rule"
          message={
            <>
              Are you sure you want to update the approval rule{' '}
              <strong>{values.rule_name}</strong>?
            </>
          }
        />
      </div>
    </div>
  );
}

// ─── State Components ─────────────────────────────────────────────────────────

// function StatusBadge({ active }: { active: boolean }) {
//   return active ? (
//     <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
//       <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
//       Active
//     </span>
//   ) : (
//     <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
//       <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
//       Inactive
//     </span>
//   );
// }

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
      <div className="w-8 h-8 border-[3px] border-[var(--brand-600)] border-t-transparent rounded-full animate-spin" />
      <span className="sr-only">Loading approval rules…</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center" role="alert">
      <p className="text-sm font-semibold text-red-600">Something went wrong</p>
      <p className="text-xs text-slate-500 mt-1 max-w-xs">{message}</p>
      <button type="button" className="btn-secondary mt-4" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

// function EmptyState({ onAdd }: { onAdd: () => void }) {
//   return (
//     <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
//       <p className="text-sm font-semibold text-slate-700">No approval rules yet</p>
//       <p className="text-xs text-slate-500 mt-1 max-w-xs">
//         Create your first rule to start routing expenses automatically based on amount thresholds.
//       </p>
//       <button type="button" className="btn-primary mt-4" onClick={onAdd}>
//         <Plus size={16} />
//         Add your first rule
//       </button>
//     </div>
//   );
// }