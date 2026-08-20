import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  PowerOff,
  Power,
  Loader2,
  Search,
  Tag,
} from 'lucide-react';

import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { ColorBadge } from '../../components/ui/Badge';
import {
  CategoriesProvider,
  useCategories,
} from '../../store/categoriesSlice';

const COLORS = [
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#3B82F6',
  '#8B5CF6',
  '#6B7280',
  '#EC4899',
  '#14B8A6',
];

function CategoriesPage() {
  const {
    state,
    filtered,
    setSearch,
    setStatusFilter,
    openEdit,
    closeModal,
    setEditing,
    save,
    toggleActive,
  } = useCategories();

  const {
    loading,
    saving,
    search,
    statusFilter,
    modalOpen,
    editing,
  } = state;

  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<
    typeof filtered[number] | null
  >(null);

  // Amount inputs
  const [dailyLimitInput, setDailyLimitInput] = useState('');
  const [monthlyLimitInput, setMonthlyLimitInput] = useState('');
  const [receiptAmountInput, setReceiptAmountInput] = useState('');

  // Monthly limit validation error
  const [monthlyLimitError, setMonthlyLimitError] = useState('');

  const [categorySuggestions, setCategorySuggestions] = useState<
    typeof filtered[number][]
  >([]);

  useEffect(() => {
    if (!modalOpen) return;

    setTimeout(() => {
      const firstField = document.querySelector<HTMLElement>(
        '.category-form-field'
      );

      firstField?.focus();
    }, 0);
  }, [modalOpen]);

  /*
   * Filter categories by Active / Inactive
   */
  const searchFiltered = filtered.filter(item => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) return true;

    return (
      item.name?.toLowerCase().includes(searchValue) ||
      item.code?.toLowerCase().includes(searchValue) ||
      item.description?.toLowerCase().includes(searchValue)
    );
  });

  const statusFiltered = searchFiltered.filter(item =>
    statusFilter === 'active'
      ? item.active
      : !item.active
  );

  const handleEnterNextField = (
    e: React.KeyboardEvent<HTMLElement>
  ) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();

    // Name is required
    if (
      e.currentTarget instanceof HTMLInputElement &&
      e.currentTarget.placeholder === 'Category name' &&
      !editing.name?.trim()
    ) {
      return;
    }

    const fields = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.category-form-field'
      )
    );

    const currentIndex = fields.indexOf(e.currentTarget);

    if (currentIndex === -1) return;

    const nextField = fields[currentIndex + 1];

    if (nextField) {
      nextField.focus();
    } else {
      document
        .getElementById('category-save-button')
        ?.focus();
    }
  };

  /*
   * Reset amount input values
   */
  const resetLimitInputs = () => {
    setDailyLimitInput('');
    setMonthlyLimitInput('');
    setReceiptAmountInput('');
    setMonthlyLimitError('');
  };

  /*
   * Validate Monthly Limit
   *
   * Maximum Monthly Limit = Daily Limit × 30
   */
  const validateMonthlyLimit = (
    dailyValue: string,
    monthlyValue: string
  ) => {
    // No validation if either limit is empty
    if (
      !dailyValue ||
      dailyValue === '.' ||
      !monthlyValue ||
      monthlyValue === '.'
    ) {
      setMonthlyLimitError('');
      return true;
    }

    const dailyLimit = Number(dailyValue);
    const monthlyLimit = Number(monthlyValue);

    const maximumMonthlyLimit = dailyLimit * 30;

    if (monthlyLimit > maximumMonthlyLimit) {
      setMonthlyLimitError(
        `Monthly limit cannot exceed ₹${maximumMonthlyLimit.toLocaleString(
          'en-IN'
        )}`
      );

      return false;
    }

    setMonthlyLimitError('');

    return true;
  };

  /*
   * Save category
   */
  async function handleSave() {
    // Validate monthly limit before saving
    const monthlyLimitValid = validateMonthlyLimit(
      dailyLimitInput,
      monthlyLimitInput
    );

    if (!monthlyLimitValid) {
      return;
    }

    if (editing.id) {
      setConfirmUpdate(true);
      return;
    }

    await save();
  }

  /*
   * Click Activate / Deactivate
   */
  const handleToggleClick = (
    item: typeof filtered[number]
  ) => {
    setSelectedCategory(item);
    setConfirmToggle(true);
  };

  /*
   * Confirm Activate / Deactivate
   */
  const handleConfirmToggle = async () => {
    if (!selectedCategory) return;

    setConfirmToggle(false);

    await toggleActive(selectedCategory);

    setSelectedCategory(null);
  };

  /*
   * Open Edit Modal
   */
  const handleEdit = (
    item: typeof filtered[number]
  ) => {
    // Daily limit
    const dailyValue =
      item.daily_limit_amount !== undefined &&
        item.daily_limit_amount !== null
        ? String(item.daily_limit_amount)
        : '';

    // Monthly limit
    const monthlyValue =
      item.monthly_limit_amount !== undefined &&
        item.monthly_limit_amount !== null
        ? String(item.monthly_limit_amount)
        : '';

    // Receipt amount
    const receiptValue =
      item.receipt_required_above_amount !== undefined &&
        item.receipt_required_above_amount !== null
        ? String(item.receipt_required_above_amount)
        : '';

    setDailyLimitInput(dailyValue);
    setMonthlyLimitInput(monthlyValue);
    setReceiptAmountInput(receiptValue);

    // Validate existing values when editing
    validateMonthlyLimit(
      dailyValue,
      monthlyValue
    );

    openEdit(item);
  };

  /*
   * Open Add Category Modal
   */
  const handleAddCategory = () => {
    resetLimitInputs();
    openEdit();

    setTimeout(() => {
      document
        .getElementById('category-name-input')
        ?.focus();
    }, 0);
  };

  /*
   * Close modal and reset temporary input values
   */
  const handleCloseModal = () => {
    resetLimitInputs();
    closeModal();
  };

  return (
    <div className="page-transition">

      {/* ================= HEADER ================= */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Expense Categories
          </h1>

          <p className="page-subtitle">
            Manage expense category groups and rules
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
                  statusFilter === 'active'
                    ? 'inactive'
                    : 'active'
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
              {statusFilter === 'active'
                ? 'Active'
                : 'Deactive'}
            </span>
          </div>

          {/* Add Category */}
          <button
            onClick={handleAddCategory}
            className="btn-primary"
          >
            <Plus size={15} />
            Add Category
          </button>

        </div>
      </div>

      {/* ================= SEARCH ================= */}
      <div className="card p-4 mb-6">
        <div className="relative">

          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search ?? ''}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Search categories..."
            className="input pl-9"
          />

        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="card overflow-hidden">

        <table className="w-full">

          <thead>
            <tr className="border-b border-slate-100">

              <th className="table-header">
                Category
              </th>

              <th className="table-header">
                Rules
              </th>

              <th className="table-header">
                Daily Limit
              </th>

              <th className="table-header">
                Monthly Limit
              </th>

              <th className="table-header">
                Status
              </th>

              <th className="table-header text-right">
                Actions
              </th>

            </tr>
          </thead>

          <tbody>

            {/* LOADING */}
            {loading ? (

              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10"
                >
                  <div className="flex justify-center">

                    <div className="w-6 h-6 border-[3px] border-[var(--brand-600)] border-t-transparent rounded-full animate-spin" />

                  </div>
                </td>
              </tr>

            ) : statusFiltered.length === 0 ? (

              /* NO DATA */
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10 text-slate-400 text-sm"
                >
                  No categories found
                </td>
              </tr>

            ) : (

              /* DATA */
              statusFiltered.map(item => (

                <tr
                  key={item.id}
                  className={`border-b border-slate-50 last:border-0 transition-colors ${item.active
                    ? 'hover:bg-slate-50'
                    : 'bg-slate-50/60 hover:bg-slate-100/60'
                    }`}
                >

                  {/* CATEGORY */}
                  <td className="table-cell">

                    <div className="flex items-center gap-3">

                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${item.color}20`,
                        }}
                      >
                        <Tag
                          size={14}
                          style={{
                            color: item.color,
                          }}
                        />
                      </div>

                      <div>

                        <p
                          className={`text-sm font-semibold ${item.active
                            ? 'text-slate-800'
                            : 'text-slate-400 line-through decoration-slate-300'
                            }`}
                        >
                          {item.name}
                        </p>

                        <p className="text-xs font-mono text-slate-400">
                          {item.code}
                        </p>

                      </div>

                    </div>

                  </td>

                  {/* RULES */}
                  <td className="table-cell">

                    <div className="flex flex-wrap gap-1">

                      {item.approval_required && (
                        <ColorBadge
                          label="Approval"
                          color="#F59E0B"
                        />
                      )}

                      {item.receipt_required && (
                        <ColorBadge
                          label="Receipt"
                          color="#3B82F6"
                        />
                      )}

                      {!item.approval_required &&
                        !item.receipt_required && (
                          <span className="text-xs text-slate-400">
                            No rules
                          </span>
                        )}

                    </div>

                  </td>

                  {/* DAILY LIMIT */}
                  <td className="table-cell">

                    {item.daily_limit_amount ? (
                      <span className="text-sm font-medium text-slate-700">
                        ₹
                        {item.daily_limit_amount.toLocaleString(
                          'en-IN'
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">
                        No limit
                      </span>
                    )}

                  </td>

                  {/* MONTHLY LIMIT */}
                  <td className="table-cell">

                    {item.monthly_limit_amount ? (
                      <span className="text-sm font-medium text-slate-700">
                        ₹
                        {item.monthly_limit_amount.toLocaleString(
                          'en-IN'
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">
                        No limit
                      </span>
                    )}

                  </td>

                  {/* STATUS */}
                  <td className="table-cell">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${item.active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-600'
                        }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${item.active
                          ? 'bg-emerald-500'
                          : 'bg-red-500'
                          }`}
                      />

                      {item.active
                        ? 'Active'
                        : 'Deactive'}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="table-cell text-right">

                    <div className="flex items-center justify-end gap-1">

                      {/* EDIT */}
                      {item.active && (
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(item)
                          }
                          title="Edit"
                          className="cc-action-btn group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:shadow-md"
                        >
                          <Edit2
                            size={13}
                            strokeWidth={2}
                          />

                          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                            Edit
                          </span>
                        </button>
                      )}

                      {/* ACTIVATE / DEACTIVATE */}
                      <button
                        onClick={() =>
                          handleToggleClick(item)
                        }
                        title={
                          item.active
                            ? 'Deactivate'
                            : 'Activate'
                        }
                        className={`cc-action-btn group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-all hover:shadow-md ${item.active
                          ? 'border-red-200 bg-white text-red-400'
                          : 'border-emerald-200 bg-white text-emerald-500'
                          }`}
                      >

                        {item.active ? (
                          <PowerOff
                            size={13}
                            strokeWidth={2}
                          />
                        ) : (
                          <Power
                            size={13}
                            strokeWidth={2}
                          />
                        )}

                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          {item.active
                            ? 'Deactivate'
                            : 'Activate'}
                        </span>

                      </button>

                    </div>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {/* ================= MODAL ================= */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={
          editing.id
            ? 'Edit Category'
            : 'New Expense Category'
        }
        size="md"
        footer={
          <>
            <button
              onClick={handleCloseModal}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              id="category-save-button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary min-w-[100px]"
            >
              {saving ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : editing.id ? (
                'Update Category'
              ) : (
                'Create Category'
              )}
            </button>
          </>
        }
      >

        <div className="space-y-4">

          {/* NAME */}
          <div className="relative">

            <label className="label">
              Category Name *
            </label>

            <input
              id="category-name-input"
              className="input category-form-field"
              placeholder="Category name"
              value={editing.name ?? ''}
              onChange={e => {
                const value = e.target.value;

                // Allow only letters and spaces
                if (!/^[A-Za-z\s]*$/.test(value)) {
                  return;
                }

                setEditing({
                  name: value,
                });

                // Suggestions only while creating a new category
                if (!editing.id && value.trim()) {
                  const searchValue =
                    value.trim().toLowerCase();

                  const matches = state.items.filter(
                    item =>
                      item.name
                        .toLowerCase()
                        .includes(searchValue)
                  );

                  setCategorySuggestions(matches);
                } else {
                  setCategorySuggestions([]);
                }
              }}
              onKeyDown={handleEnterNextField}
              onBlur={() => {
                // Small delay so suggestion can be clicked
                setTimeout(
                  () => setCategorySuggestions([]),
                  150
                );
              }}
            />

            {!editing.id &&
              categorySuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">

                  <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Existing categories
                  </div>

                  {categorySuggestions.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onMouseDown={e =>
                        e.preventDefault()
                      }
                      onClick={() => {
                        setEditing({
                          name: item.name,
                        });
                        setCategorySuggestions([]);
                      }}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: item.color,
                          }}
                        />
                        {item.name}
                      </span>

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

          {/* DESCRIPTION */}
          <div>

            <label className="label">
              Description
            </label>

            <textarea
              className="input resize-none category-form-field"
              rows={2}
              placeholder="Optional description"
              value={editing.description ?? ''}
              onChange={e =>
                setEditing({
                  description: e.target.value,
                })
              }
              onKeyDown={handleEnterNextField}
            />

          </div>

          {/* DAILY + MONTHLY */}
          <div className="grid grid-cols-2 gap-4">

            {/* DAILY */}
            <div>

              <label className="label">
                Daily Limit
              </label>

              <input
                type="text"
                inputMode="decimal"
                className="input category-form-field"
                placeholder="No limit"
                value={dailyLimitInput}
                onChange={e => {
                  const value = e.target.value;

                  if (!/^\d*\.?\d{0,2}$/.test(value)) {
                    return;
                  }

                  setDailyLimitInput(value);

                  setEditing({
                    daily_limit_amount:
                      value === '' || value === '.'
                        ? undefined
                        : Number(value),
                  });

                  // Revalidate monthly limit
                  // whenever daily limit changes
                  validateMonthlyLimit(
                    value,
                    monthlyLimitInput
                  );
                }}
                onKeyDown={handleEnterNextField}
              />

            </div>

            {/* MONTHLY */}
            <div>

              <label className="label">
                Monthly Limit
              </label>

              <input
                type="text"
                inputMode="decimal"
                className={`input category-form-field ${monthlyLimitError
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : ''
                  }`}
                placeholder="No limit"
                value={monthlyLimitInput}
                onChange={e => {
                  const value = e.target.value;

                  if (!/^\d*\.?\d{0,2}$/.test(value)) {
                    return;
                  }

                  setMonthlyLimitInput(value);

                  setEditing({
                    monthly_limit_amount:
                      value === '' || value === '.'
                        ? undefined
                        : Number(value),
                  });

                  // Validate monthly against
                  // daily × 30
                  validateMonthlyLimit(
                    dailyLimitInput,
                    value
                  );
                }}
                onKeyDown={handleEnterNextField}
              />

              {/* VALIDATION ERROR */}
              {monthlyLimitError && (
                <p className="mt-1 text-xs text-red-600">
                  {monthlyLimitError}
                </p>
              )}

              {/* MAXIMUM MONTHLY LIMIT */}
              {!monthlyLimitError &&
                dailyLimitInput &&
                dailyLimitInput !== '.' && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    Maximum monthly limit: ₹
                    {(
                      Number(dailyLimitInput) * 30
                    ).toLocaleString('en-IN')}
                  </p>
                )}

            </div>

          </div>

          {/* CATEGORY COLOR */}
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() =>
                setEditing({
                  color: c,
                })
              }
              onKeyDown={
                editing.color === c
                  ? handleEnterNextField
                  : undefined
              }
              className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${editing.color === c
                ? 'category-form-field ring-2 ring-offset-2 ring-[var(--brand-600)] scale-110'
                : ''
                }`}
              style={{
                backgroundColor: c,
              }}
            />
          ))}

          {/* APPROVAL + RECEIPT */}
          <div className="flex gap-6">

            {/* APPROVAL REQUIRED */}
            <label className="flex items-center gap-2 cursor-pointer">

              <input
                type="checkbox"
                checked={
                  editing.approval_required ?? false
                }
                onChange={e =>
                  setEditing({
                    approval_required:
                      e.target.checked,
                  })
                }
                onKeyDown={handleEnterNextField}
                className="category-form-field w-4 h-4 rounded text-[var(--brand-600)] border-slate-300 bg-white focus:ring-[var(--brand-500)]"
              />

              <span className="text-sm text-slate-700 font-medium">
                Approval Required
              </span>

            </label>

            {/* RECEIPT REQUIRED */}
            <label className="flex items-center gap-2 cursor-pointer">

              <input
                type="checkbox"
                checked={
                  editing.receipt_required ?? false
                }
                onChange={e =>
                  setEditing({
                    receipt_required:
                      e.target.checked,
                  })
                }
                onKeyDown={handleEnterNextField}
                className="category-form-field w-4 h-4 rounded text-[var(--brand-600)] border-slate-300 bg-white focus:ring-[var(--brand-500)]"
              />

              <span className="text-sm text-slate-700 font-medium">
                Receipt Required
              </span>

            </label>

          </div>

          {/* RECEIPT AMOUNT */}
          {editing.receipt_required && (

            <div>

              <label className="label">
                Receipt Required Above Amount (₹)
              </label>

              <input
                type="text"
                inputMode="decimal"
                className="input category-form-field"
                placeholder="Enter amount"
                value={receiptAmountInput}
                onChange={e => {

                  const value = e.target.value;

                  if (
                    !/^\d*\.?\d{0,2}$/.test(
                      value
                    )
                  ) {
                    return;
                  }

                  setReceiptAmountInput(value);

                  setEditing({
                    receipt_required_above_amount:
                      value === '' ||
                        value === '.'
                        ? undefined
                        : Number(value),
                  });

                }}
                onKeyDown={handleEnterNextField}
              />

            </div>

          )}

          {/* ACTIVE TOGGLE */}
          {editing.id ? (

            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">

              <div>

                <p className="text-xs font-semibold text-slate-700">
                  Active
                </p>

                <p className="text-[10px] text-slate-400">
                  Inactive categories won't appear
                  in expense entries
                </p>

              </div>

              <button
                type="button"
                role="switch"
                aria-checked={
                  editing.active ?? true
                }
                onClick={() =>
                  setEditing({
                    active: !editing.active,
                  })
                }
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${(editing.active ?? true)
                  ? 'bg-[var(--brand-600)]'
                  : 'bg-slate-300'
                  }`}
              >

                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${(editing.active ?? true)
                    ? 'translate-x-4'
                    : 'translate-x-0'
                    }`}
                />

              </button>

            </div>

          ) : (

            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700">

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

              New categories will be created as{' '}
              <strong>Active</strong> by default.

            </div>

          )}

        </div>

      </Modal>

      {/* ================= UPDATE CONFIRMATION ================= */}
      <ConfirmDialog
        open={confirmUpdate}
        onClose={() =>
          setConfirmUpdate(false)
        }
        onConfirm={async () => {

          setConfirmUpdate(false);

          await save();

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

      {/* ================= ACTIVATE / DEACTIVATE CONFIRMATION ================= */}
      <ConfirmDialog
        open={confirmToggle}
        onClose={() => {

          setConfirmToggle(false);
          setSelectedCategory(null);

        }}
        onConfirm={handleConfirmToggle}
        title={
          selectedCategory?.active
            ? 'Confirm Deactivation'
            : 'Confirm Activation'
        }
        confirmText={
          selectedCategory?.active
            ? 'Deactivate'
            : 'Activate'
        }
        message={
          <>
            Are you sure you want to{' '}
            <strong>
              {selectedCategory?.active
                ? 'deactivate'
                : 'activate'}
            </strong>{' '}
            the category{' '}
            <strong>
              {selectedCategory?.name}
            </strong>
            ?
          </>
        }
      />

    </div>
  );
}

export function Categories() {
  return (
    <CategoriesProvider>
      <CategoriesPage />
    </CategoriesProvider>
  );
}