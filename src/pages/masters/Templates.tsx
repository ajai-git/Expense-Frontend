import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { ChevronDown, Eye, Plus, Receipt, RefreshCw, Users, X } from 'lucide-react';
import { TemplatesProvider, useTemplates, TemplateRowPayload, } from '../../store/Templatesslice';
import { Modal } from '../../components/ui/Modal';
import { apiRequest } from '../../lib/api';
import { getEmployees } from '../../lib/employeeApi';
import { getLocations } from '../../lib/locationApi';
import type { Employee, ExpenseCategory, ExpenseName } from '../../types';

interface Location {
  locationId: string;
  branchName: string;
  status?: string;
}

interface EmployeeTag {
  id: string;
  name: string;
  amount: string;
}

interface DropdownOption {
  value: string;
  label: string;
  rightLabel?: string;
}

interface DropdownProps {
  id: string;
  value: string;
  options: DropdownOption[];
  placeholder: string;
  disabled?: boolean;
  open: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
  onChange: (value: string) => void;
}

function Dropdown({ id, value, options, placeholder, disabled = false, open, onToggle, onClose, onChange }: DropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(option => option.value === value);
  const [search, setSearch] = useState('');
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) onClose();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open, onClose]);
  const filteredOptions = options.filter(option =>
    `${option.label} ${option.rightLabel ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const selectOption = (optionValue: string) => {
    onChange(optionValue);
    onClose();
  };

  return (
    <div ref={dropdownRef} className="relative">
      <input
        type="text"
        disabled={disabled}
        value={open ? search : selectedOption?.label ?? ''}
        placeholder={placeholder}
        onFocus={() => {
          if (!open) onToggle(id);
        }}
        onChange={event => setSearch(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape') onClose();
        }}
        className="input w-full pr-9 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      {open && !disabled && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">No options available</p>
          ) : (
            filteredOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => selectOption(option.value)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 ${option.value === value ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
              >
                <span>{option.label}</span>
                {option.rightLabel && <span className="text-xs text-slate-400">{option.rightLabel}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await apiRequest(path, { method: 'GET' });

  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }

  return response as T;
}

function TemplatesInner() {
  const {
    state,
    openPreview,
    closePreview,
    openAddModal,
    closeAddModal,
    setForm,
    refresh,
    save,
    toggleActive,
  } = useTemplates();

  const {
    items: templates,
    loading,
    saving,
    previewTemplate,
    addModalOpen,
    form,
  } = state;

  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenseNames, setExpenseNames] = useState<ExpenseName[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loadingMasters, setLoadingMasters] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedExpenseId, setSelectedExpenseId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeAmount, setEmployeeAmount] = useState('');
  const [employeeTags, setEmployeeTags] = useState<EmployeeTag[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMasterData() {
      setLoadingMasters(true);

      const [locationResult, categoryResult] = await Promise.allSettled([
        getLocations(),
        fetchJson<ExpenseCategory[]>('/api/v1/masters/categories?active_only=true'),
      ]);

      if (cancelled) return;

      if (locationResult.status === 'fulfilled') {
        const activeLocations = (locationResult.value ?? [])
          .map(location => {
            const item = location as unknown as Record<string, unknown>;

            return {
              locationId: String(item.locationId ?? item.location_id ?? item.id ?? ''),
              branchName: String(item.branchName ?? item.branch_name ?? item.name ?? ''),
              status: typeof item.status === 'string' ? item.status : undefined,
            };
          })
          .filter(
            location =>
              location.locationId &&
              (!location.status || location.status.toLowerCase() === 'active'),
          );

        setLocations(activeLocations);
      } else {
        console.error('Failed to load locations:', locationResult.reason);
        setLocations([]);
      }

      if (categoryResult.status === 'fulfilled') {
        setCategories(categoryResult.value ?? []);
      } else {
        console.error('Failed to load categories:', categoryResult.reason);
        setCategories([]);
      }

      setLoadingMasters(false);
    }

    loadMasterData().catch(error => {
      if (!cancelled) {
        console.error('Failed to load template master data:', error);
        setLoadingMasters(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) {
      setExpenseNames([]);
      setSelectedExpenseId('');
      return;
    }

    let cancelled = false;

    async function loadExpenseNames() {
      setLoadingExpenses(true);

      try {
        const data = await fetchJson<ExpenseName[]>(
          `/api/v1/masters/expense-names?active_only=true&category_id=${encodeURIComponent(selectedCategoryId)}`,
        );

        if (!cancelled) setExpenseNames(data ?? []);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load expense names:', error);
          setExpenseNames([]);
        }
      } finally {
        if (!cancelled) setLoadingExpenses(false);
      }
    }

    setSelectedExpenseId('');
    setEmployeeTags([]);
    loadExpenseNames();

    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!addModalOpen || employees.length > 0) return;

    let cancelled = false;

    async function loadEmployees() {
      setLoadingEmployees(true);

      try {
        const data = await getEmployees();
        if (!cancelled) setEmployees(data ?? []);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load employees:', error);
          setEmployees([]);
        }
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    }

    loadEmployees();

    return () => {
      cancelled = true;
    };
  }, [addModalOpen, employees.length]);

  const resetTemplateFields = () => {
    setForm({
      template_name: '',
      location_id: '',
    });

    setSelectedCategoryId('');
    setSelectedExpenseId('');
    setSelectedLocationId('');
    setSelectedEmployeeId('');
    setEmployeeAmount('');
    setEmployeeTags([]);
    setOpenDropdown(null);
  };

  const toggleDropdown = (id: string) => {
    setOpenDropdown(current => (current === id ? null : id));
  };

  const addEmployee = () => {
    const employee = employees.find(item => item.id === selectedEmployeeId);

    if (!employee || !employeeAmount || employeeTags.some(tag => tag.id === employee.id)) {
      return;
    }

    setEmployeeTags(currentTags => [
      ...currentTags,
      { id: employee.id, name: employee.name, amount: employeeAmount },
    ]);
    setSelectedEmployeeId('');
    setEmployeeAmount('');
  };

  const handleEmployeeKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addEmployee();
    }
  };

  const handleCreate = async (event?: FormEvent) => {
    event?.preventDefault();

    if (!selectedCategoryId) {
      // You can use your notify here if available,
      // but save validation will also catch missing rows.
      return;
    }

    if (!selectedExpenseId) {
      return;
    }

    const rows: TemplateRowPayload[] = [
      {
        expense_name_id: selectedExpenseId,
        category_id: selectedCategoryId,
        default_amount: 0,
        employee_required: employeeTags.length > 0,
        employee_allocations: employeeTags.map(tag => ({
          employee_id: tag.id,
          amount: Number(tag.amount),
        })),
        remarks: '',
        sequence: 1,
      },
    ];

    await save(rows);
  };

  const handleClose = () => {
    resetTemplateFields();
    closeAddModal();
  };

  return (
    <div className="page-transition">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expense Templates</h1>
          <p className="page-subtitle">Pre-configured expense entry patterns</p>
        </div>
        <div className="flex gap-3">
          <button onClick={refresh} className="btn-secondary" aria-label="Refresh templates">
            <RefreshCw size={15} />
          </button>
          <button onClick={openAddModal} className="btn-primary">
            <Plus size={15} /> New Template
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-10 text-slate-400">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="col-span-3 text-center py-14 card">
            <Receipt size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No templates yet</p>
          </div>
        ) : (
          templates.map(template => (
            <div key={template.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Receipt size={20} className="text-blue-600" />
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${template.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {template.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{template.template_name}</h3>
              <p className="text-xs text-slate-500 mb-4">{template.rows?.length ?? 0} expense rows</p>
              <div className="space-y-1 mb-4">
                {(template.rows ?? []).slice(0, 3).map(row => (
                  <div key={row.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{row.expense_name}</span>
                    {row.default_amount > 0 && <span className="font-medium text-slate-700">₹{row.default_amount.toLocaleString('en-IN')}</span>}
                  </div>
                ))}
                {(template.rows?.length ?? 0) > 3 && <p className="text-xs text-slate-400">+{(template.rows?.length ?? 0) - 3} more rows</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openPreview(template)} className="btn-secondary flex-1 justify-center text-xs py-1.5">
                  <Eye size={13} /> Preview
                </button>
                <button onClick={() => toggleActive(template)} className={`flex-1 justify-center text-xs py-1.5 ${template.active ? 'btn-secondary' : 'btn-success'}`}>
                  {template.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {previewTemplate && (
        <Modal open={true} onClose={closePreview} title={`Template: ${previewTemplate.template_name}`} size="md">
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Expense rows</p>
              <p className="font-semibold text-slate-800 mt-0.5">{previewTemplate.rows?.length ?? 0}</p>
            </div>
            <div className="space-y-2">
              {previewTemplate.rows?.map(row => (
                <div key={row.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{row.expense_name}</p>
                    <p className="text-xs text-slate-400">{row.category_name}</p>
                  </div>
                  {row.default_amount > 0 && <span className="text-sm font-bold text-blue-700">₹{row.default_amount.toLocaleString('en-IN')}</span>}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      <Modal
        open={addModalOpen}
        onClose={handleClose}
        title="New Template"
        size="md"
        footer={<><button onClick={handleClose} className="btn-secondary">Cancel</button><button onClick={() => handleCreate()} disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create template'}</button></>}
      >
        <form className="space-y-4" onSubmit={handleCreate}>
          <div>
            <label className="label">Template name *</label>
            <input className="input" placeholder="e.g. Client site visit" value={form.template_name} onChange={event => setForm({ template_name: event.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <Dropdown
                id="category"
                value={selectedCategoryId}
                disabled={loadingMasters}
                placeholder={loadingMasters ? 'Loading categories...' : 'Select category'}
                options={categories.map(category => ({ value: category.id, label: category.name }))}
                open={openDropdown === 'category'}
                onToggle={toggleDropdown}
                onClose={() => setOpenDropdown(null)}
                onChange={setSelectedCategoryId}
              />
            </div>
            <div>
              <label className="label">Expense name *</label>
              <Dropdown
                id="expense"
                value={selectedExpenseId}
                disabled={!selectedCategoryId || loadingExpenses}
                placeholder={loadingExpenses ? 'Loading expenses...' : 'Select expense'}
                options={expenseNames.map(expense => ({ value: expense.id, label: expense.name }))}
                open={openDropdown === 'expense'}
                onToggle={toggleDropdown}
                onClose={() => setOpenDropdown(null)}
                onChange={setSelectedExpenseId}
              />
            </div>
          </div>
          <div>
            <label className="label">Location *</label>
            <Dropdown
              id="location"
              value={selectedLocationId}
              disabled={loadingMasters}
              placeholder={loadingMasters ? 'Loading locations...' : 'Select location'}
              options={locations.map(location => ({ value: location.locationId, label: location.branchName }))}
              open={openDropdown === 'location'}
              onToggle={toggleDropdown}
              onClose={() => setOpenDropdown(null)}
              onChange={(value) => {
                setSelectedLocationId(value);
                setForm({ location_id: value });
              }}
            />
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3"><Users size={16} className="text-slate-500" /><label className="label mb-0">Employee allocations</label></div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2">
              <Dropdown
                id="employee"
                value={selectedEmployeeId}
                disabled={loadingEmployees}
                placeholder={loadingEmployees ? 'Loading employees...' : 'Select employee'}
                options={employees.map(employee => ({
                  value: employee.id,
                  label: employee.name,
                  rightLabel: employee.department ?? '',
                }))}
                open={openDropdown === 'employee'}
                onToggle={toggleDropdown}
                onClose={() => setOpenDropdown(null)}
                onChange={setSelectedEmployeeId}
              />
              <input className="input" type="number" min="0" placeholder="Amount" value={employeeAmount} onChange={event => setEmployeeAmount(event.target.value)} onKeyDown={handleEmployeeKeyDown} />
              <button type="button" onClick={addEmployee} className="btn-secondary justify-center">Add</button>
            </div>
            <p className="mt-2 text-xs text-slate-400">Select an employee, enter an amount, then press Enter or Add.</p>
            {employeeTags.length > 0 && <div className="flex flex-wrap gap-2 mt-3">{employeeTags.map(tag => <span key={tag.id} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{tag.name}<span className="text-blue-500">₹{Number(tag.amount).toLocaleString('en-IN')}</span><button type="button" onClick={() => setEmployeeTags(currentTags => currentTags.filter(item => item.id !== tag.id))} aria-label={`Remove ${tag.name}`} className="text-blue-500 hover:text-blue-800"><X size={13} /></button></span>)}</div>}
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function Templates() {
  return <TemplatesProvider><TemplatesInner /></TemplatesProvider>;
}
