import { useState, useEffect } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Plus, Edit2, Search, FileText, Users, Truck, Camera, PowerOff, Power, Loader2, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { ColorBadge } from '../../components/ui/Badge';
import { ExpenseNamesProvider, useExpenseNames } from '../../store/expenseNamesSlice';
import { ExpenseName } from '../../types';

function ExpenseNamesPage() {

  const { state, filtered, setSearch, setFilterCat, setStatusFilter, openEdit, closeModal, setEditing, save, toggleActive } =
    useExpenseNames();

  const { categories, loading, saving, search, filterCat, statusFilter, modalOpen, editing } = state;


  const [rowActionId, setRowActionId] = useState<string | null>(null);
  const [rowActionError, setRowActionError] = useState<string | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [defaultAmountInput, setDefaultAmountInput] = useState('');

  const [confirmToggle, setConfirmToggle] = useState(false);
  const [selectedExpenseName, setSelectedExpenseName] =

    useState<ExpenseName | null>(null);

  const [expenseSuggestions, setExpenseSuggestions] = useState<ExpenseName[]>([]);

  useEffect(() => {
    if (!modalOpen) return;

    setTimeout(() => {
      const firstField = document.querySelector<HTMLElement>(
        '.expense-form-field'
      );

      firstField?.focus();
    }, 0);
  }, [modalOpen]);




  const handleEnterNextField = (
    e: React.KeyboardEvent<HTMLElement>
  ) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();

    const fields = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.expense-form-field'
      )
    );

    const currentIndex = fields.indexOf(
      e.currentTarget
    );

    if (currentIndex === -1) return;

    // NAME: don't allow Enter when empty
    if (
      e.currentTarget instanceof HTMLInputElement &&
      e.currentTarget.name === 'expense-name' &&
      !editing.name?.trim()
    ) {
      return;
    }

    const nextField = fields[currentIndex + 1];

    if (nextField) {
      nextField.focus();
    }
  };

  const statusFiltered = filtered.filter(item =>
    statusFilter === 'active'
      ? item.active
      : !item.active
  );

  async function handleSave() {
    const success = await save();

    if (success) {
      setDefaultAmountInput('');
    }
  }

  const handleToggleClick = (item: ExpenseName) => {
    setSelectedExpenseName(item);
    setConfirmToggle(true);
  };

  const handleConfirmToggle = async () => {
    if (!selectedExpenseName) return;

    setRowActionId(selectedExpenseName.id);
    setRowActionError(null);
    setConfirmToggle(false);

    try {
      const success = await toggleActive(selectedExpenseName);

      if (!success) {
        setRowActionError('Could not update status.');
      }
    } finally {
      setRowActionId(null);
      setSelectedExpenseName(null);
    }
  };

  return (
    <div className="page-transition">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expense Names</h1>
          <p className="page-subtitle">
            Define individual expense items and their rules
          </p>
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

          {/* Add Expense Name */}
          <button
            onClick={() => {
              setDefaultAmountInput('');
              openEdit();
            }}
            className="btn-primary"
          >
            <Plus size={15} />
            Add Expense Name
          </button>

        </div>
      </div>

      {rowActionError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={14} className="flex-shrink-0" />
          {rowActionError}
        </div>
      )}

      <div className="card p-4 mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="input pl-9"
          />
        </div>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="select w-auto"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="table-header">Name / Code</th>
              <th className="table-header">Category</th>
              <th className="table-header">Default Amt</th>
              <th className="table-header">Requirements</th>
              <th className="table-header">Status</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10">
                  <div className="flex justify-center">
                    <div className="w-6 h-6 border-[3px] border-[var(--brand-600)] border-t-transparent rounded-full animate-spin" />
                  </div>
                </td>
              </tr>
            ) : statusFiltered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">No expense names found</td></tr>
            ) : statusFiltered.map(item => (
              <tr
                key={item.id}
                className={`border-b border-slate-50 last:border-0 transition-colors ${item.active ? 'hover:bg-slate-50' : 'bg-slate-50/60 hover:bg-slate-100/60'
                  }`}
              >
                <td className="table-cell">
                  <p className={`text-sm font-semibold ${item.active ? 'text-slate-800' : 'text-slate-400 line-through decoration-slate-300'}`}>
                    {item.name}
                  </p>
                  <p className="text-xs font-mono text-slate-400">{item.code}</p>
                </td>
                <td className="table-cell">
                  {item.category_name && (
                    <ColorBadge label={item.category_name} color={item.category_color ?? '#6B7280'} />
                  )}
                </td>
                <td className="table-cell">
                  {item.default_amount > 0
                    ? <span className="font-semibold text-slate-700">₹{item.default_amount.toLocaleString('en-IN')}</span>
                    : <span className="text-slate-400 text-sm">Variable</span>}
                </td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-1">
                    {item.employee_required && <ColorBadge label="Employee" color="#10B981" />}
                    {item.driver_required && <ColorBadge label="Driver" color="#F59E0B" />}
                    {item.vehicle_required && <ColorBadge label="Vehicle" color="#3B82F6" />}
                    {item.receipt_required && <ColorBadge label="Receipt" color="#EF4444" />}
                    {item.approval_required && <ColorBadge label="Approval" color="#8B5CF6" />}
                    {!item.employee_required && !item.driver_required && !item.vehicle_required && !item.receipt_required && !item.approval_required && (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </div>
                </td>
                <td className="table-cell">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${item.active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-600'
                      }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${item.active ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                    />
                    {item.active ? 'Active' : 'Deactive'}
                  </span>
                </td>
                <td className="table-cell text-right">
                  <div className="flex items-center justify-end gap-1">
                    {item.active && (
                      <button
                        onClick={() => {
                          if (!item.active) return;

                          setDefaultAmountInput(
                            item.default_amount !== undefined &&
                              item.default_amount !== null
                              ? String(item.default_amount)
                              : ''
                          );

                          openEdit(item);
                        }}
                        title={item.active ? 'Edit' : 'Inactive items cannot be edited'}
                        disabled={!item.active}
                        className={`cc-action-btn group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-all
    ${item.active
                            ? 'border-slate-200 bg-white text-slate-500 hover:shadow-md'
                            : 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                          }`}
                      >
                        <Edit2 size={13} strokeWidth={2} />

                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          {item.active ? 'Edit' : 'Inactive - Cannot Edit'}
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleClick(item)}
                      title={item.active ? 'Deactivate' : 'Activate'}
                      disabled={rowActionId === item.id}
                      className={`cc-action-btn group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-all hover:shadow-md disabled:pointer-events-none disabled:opacity-50
                        ${item.active
                          ? 'border-red-200 bg-white text-red-400'
                          : 'border-emerald-200 bg-white text-emerald-500'
                        }`}
                    >
                      {rowActionId === item.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : item.active ? (
                        <PowerOff size={13} strokeWidth={2} />
                      ) : (
                        <Power size={13} strokeWidth={2} />
                      )}
                      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        {item.active ? 'Deactivate' : 'Activate'}
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setDefaultAmountInput('');
          closeModal();
        }}
        title={editing.id ? 'Edit Expense Name' : 'New Expense Name'}
        size="md"
        footer={
          <>
            <button
              onClick={() => {
                if (editing.id) {
                  setConfirmUpdate(true);
                } else {
                  handleSave();
                }
              }}
              disabled={saving}
              className="btn-primary min-w-[100px] expense-create-button"
            >
              {saving ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : editing.id ? (
                'Update Expense Name'
              ) : (
                'Create Expense Name'
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Category *</label>
            <select
              className="select expense-form-field"
              value={editing.category_id ?? ''}
              onChange={e =>
                setEditing({
                  category_id: e.target.value
                })
              }
              onKeyDown={handleEnterNextField}
            >
              <option value="">Select category</option>

              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="label">Expense Name *</label>

            <input
              name="expense-name"
              className="input expense-form-field"
              placeholder="Expense name"
              value={editing.name ?? ''}
              onChange={e => {
                const value = e.target.value;

                // Allow only letters and spaces
                if (!/^[A-Za-z0-9\s]*$/.test(value)) {
                  return;
                }

                setEditing({
                  name: value,
                });

                // Suggestions only while creating a new expense
                if (!editing.id && value.trim()) {
                  const searchValue = value.trim().toLowerCase();

                  const matches = state.items.filter(item =>
                    item.name.toLowerCase().includes(searchValue)
                  );

                  setExpenseSuggestions(matches);
                } else {
                  setExpenseSuggestions([]);
                }
              }}
              onKeyDown={handleEnterNextField}
              onBlur={() => {
                // Small delay so clicking a suggestion works
                setTimeout(() => setExpenseSuggestions([]), 150);
              }}
            />

            {!editing.id && expenseSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Existing expense names
                </div>

                {expenseSuggestions.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setEditing({
                        name: item.name,
                      });
                      setExpenseSuggestions([]);
                    }}
                  >
                    <span className="font-medium">{item.name}</span>

                    {item.active && (
                      <span className="text-[10px] text-emerald-600">
                        Active
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Default Amount (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                className="input expense-form-field"
                placeholder="Enter amount"
                value={defaultAmountInput}
                onChange={e => {
                  const value = e.target.value;

                  if (!/^\d*\.?\d{0,2}$/.test(value)) {
                    return;
                  }

                  setDefaultAmountInput(value);

                  setEditing({
                    default_amount:
                      value === '' || value === '.'
                        ? undefined
                        : Number(value),
                  });
                }}
                onKeyDown={handleEnterNextField}
              />
            </div>
            <div>
              <label className="label">Default Remarks</label>
              <input
                className="input expense-form-field"
                value={editing.default_remarks ?? ''}
                onChange={e =>
                  setEditing({
                    default_remarks: e.target.value
                  })
                }
                onKeyDown={handleEnterNextField}
              />
            </div>
          </div>

          <div>
            <label className="label">Requirements</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                {
                  key: 'employee_required',
                  label: 'Employee Required',
                  icon: <Users size={14} />
                },
                {
                  key: 'allow_multiple_employees',
                  label: 'Multiple Employees',
                  icon: <Users size={14} />
                },
                {
                  key: 'driver_required',
                  label: 'Driver Required',
                  icon: <Truck size={14} />
                },
                {
                  key: 'vehicle_required',
                  label: 'Vehicle Required',
                  icon: <Truck size={14} />
                },
                {
                  key: 'receipt_required',
                  label: 'Receipt Required',
                  icon: <Camera size={14} />
                },
                {
                  key: 'approval_required',
                  label: 'Approval Required',
                  icon: <FileText size={14} />
                },
              ].map(({ key, label, icon }, index) => (
                <label
                  key={key}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(
                      (editing as Record<string, boolean | undefined>)[key]
                    )}
                    onChange={e =>
                      setEditing({
                        [key]: e.target.checked
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;

                      e.preventDefault();

                      const createButton =
                        document.querySelector<HTMLElement>(
                          '.expense-create-button'
                        );

                      if (createButton) {
                        createButton.focus();
                      }
                    }}
                    className={`w-4 h-4 rounded text-[var(--brand-600)] border-slate-300 bg-white focus:ring-[var(--brand-500)] ${index === 0 ? 'expense-form-field' : ''
                      }`}
                  />

                  <span className="text-slate-400">
                    {icon}
                  </span>

                  <span className="text-sm text-slate-700">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {editing.id ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-700">Active</p>
                <p className="text-[10px] text-slate-400">
                  Inactive expense names won't appear in entry forms
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={editing.active ?? true}
                onClick={() => setEditing({ active: !editing.active })}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none
                  ${(editing.active ?? true) ? 'bg-[var(--brand-600)]' : 'bg-slate-300'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200
                    ${(editing.active ?? true) ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              New expense names will be created as <strong>Active</strong> by default.
            </div>
          )}
        </div>

      </Modal>

      <ConfirmDialog
        open={confirmUpdate}
        onClose={() => setConfirmUpdate(false)}
        onConfirm={async () => {
          const success = await save();

          if (success) {
            setConfirmUpdate(false);
          }
        }}
        title="Confirm Update"
        confirmText="Update"
        message={
          <>
            Are you sure you want to update{' '}
            <strong>{editing.name}</strong>?
          </>
        }
      />
      <ConfirmDialog
        open={confirmToggle}
        onClose={() => {
          setConfirmToggle(false);
          setSelectedExpenseName(null);
        }}
        onConfirm={handleConfirmToggle}
        title={
          selectedExpenseName?.active
            ? 'Confirm Deactivation'
            : 'Confirm Activation'
        }
        confirmText={
          selectedExpenseName?.active
            ? 'Deactivate'
            : 'Activate'
        }
        message={
          <>
            Are you sure you want to{' '}
            <strong>
              {selectedExpenseName?.active
                ? 'deactivate'
                : 'activate'}
            </strong>{' '}
            the expense name{' '}
            <strong>{selectedExpenseName?.name}</strong>?
          </>
        }
      />
    </div>
  );
}

export function ExpenseNames() {
  return (
    <ExpenseNamesProvider>
      <ExpenseNamesPage />
    </ExpenseNamesProvider>
  );
}