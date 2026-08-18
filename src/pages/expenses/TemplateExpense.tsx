import { useEffect, useState } from 'react';
import { Send, Save, X, Users, Receipt } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { mongoDb } from '../../lib/mongoApi';
import { ExpenseTemplate, CostCenter, Employee, CashSession } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateRow {
  rowId: string;
  expenseNameId: string;
  categoryId: string;
  expenseName: string;
  categoryName: string;
  amount: string;
  remarks: string;
  employeeRequired: boolean;
  selectedEmployees: string[];
}

// FIX: Strict type for the database join response to remove all 'any' errors
interface TemplateRowJoin {
  id: string;
  expense_name_id: string;
  category_id: string;
  default_amount: number;
  remarks: string;
  employee_required: boolean;
  expense_names: { name: string; code: string; category_id: string } | null;
  expense_categories: { name: string } | null;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function generateExpenseNo() {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `EXP-${ds}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TemplateExpense() {
  const { notify, navigate, state } = useApp();
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedCostCenter, setSelectedCostCenter] = useState('');
  const [businessDate] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<TemplateRow[]>([]);

  // 1. Load Masters
  useEffect(() => {
    async function loadMasters() {
      setLoading(true);
      const [tmplRes, ccRes, empRes] = await Promise.all([
        mongoDb.from<ExpenseTemplate>('expense_templates').select('*').eq('active', true).eq('is_deleted', false).order('template_name'),
        mongoDb.from<CostCenter>('cost_centers').select('*').eq('active', true).order('name'),
        mongoDb.from<Employee>('employees').select('*').eq('active', true).order('name'),
      ]);
      
      if (tmplRes.data) setTemplates(Array.isArray(tmplRes.data) ? tmplRes.data : [tmplRes.data]);
      if (ccRes.data) setCostCenters(Array.isArray(ccRes.data) ? ccRes.data : [ccRes.data]);
      if (empRes.data) setEmployees(Array.isArray(empRes.data) ? empRes.data : [empRes.data]);
      
      setLoading(false);
    }
    loadMasters();
  }, []);

  // 2. Fetch Cash Session dynamically
  useEffect(() => {
    if (!selectedCostCenter) return;
    
    async function fetchSession() {
      const { data } = await mongoDb.from<CashSession>('cash_sessions')
        .select('*')
        .eq('business_date', businessDate)
        .eq('cost_center_id', selectedCostCenter)
        .eq('status', 'open')
        .maybeSingle();
      setSession(data ?? null);
    }
    
    fetchSession();
  }, [selectedCostCenter, businessDate]);

  // 3. Load Template Rows
  // FIX: Moved logic inside useEffect to remove the missing dependency infinite loop error
  useEffect(() => {
    if (!selectedTemplate) return;

    async function fetchRows() {
      const { data } = await mongoDb.from<TemplateRowJoin>('expense_template_rows')
        .select('*, expense_names(name, code, category_id), expense_categories(name)')
        .eq('template_id', selectedTemplate)
        .order('sequence');

      if (data) {
        setRows(data.map((r) => ({
          rowId: r.id,
          expenseNameId: r.expense_name_id,
          categoryId: r.category_id,
          expenseName: r.expense_names?.name ?? '',
          categoryName: r.expense_categories?.name ?? '',
          amount: r.default_amount ? String(r.default_amount) : '',
          remarks: r.remarks ?? '',
          employeeRequired: r.employee_required,
          selectedEmployees: [],
        })));
      }
    }

    fetchRows();
  }, [selectedTemplate]);

  const totalAmount = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  function updateRow(rowId: string, updates: Partial<TemplateRow>) {
    setRows(prev => prev.map(r => r.rowId === rowId ? { ...r, ...updates } : r));
  }

  function toggleEmployee(rowId: string, empId: string) {
    const row = rows.find(r => r.rowId === rowId);
    if (!row) return;
    
    const selected = row.selectedEmployees.includes(empId)
      ? row.selectedEmployees.filter(e => e !== empId)
      : [...row.selectedEmployees, empId];
      
    updateRow(rowId, { selectedEmployees: selected });
  }

  async function submitBatch(status: 'draft' | 'submitted') {
    if (!selectedCostCenter || rows.length === 0) {
      notify('Select cost center and template', 'error'); 
      return;
    }
    
    setSubmitting(true);

    const batchId = crypto.randomUUID();
    const costCenter = costCenters.find(c => c.id === selectedCostCenter);
    const errors: string[] = [];
    const validRows = rows.filter(r => parseFloat(r.amount) > 0);

    for (const row of validRows) {
      const amount = parseFloat(row.amount);
      const payload = {
        expense_no: generateExpenseNo(),
        business_date: businessDate,
        cash_session_id: session?.id ?? null,
        cost_center_id: selectedCostCenter,
        category_id: row.categoryId,
        expense_name_id: row.expenseNameId,
        template_id: selectedTemplate,
        batch_id: batchId,
        amount,
        payment_mode: 'cash',
        remarks: row.remarks,
        category_name: row.categoryName,
        expense_name: row.expenseName,
        cost_center_name: costCenter?.name ?? '',
        employee_assignments: row.selectedEmployees.map(eid => ({
          employeeId: eid,
          employeeName: employees.find(e => e.id === eid)?.name ?? '',
          shareAmount: row.selectedEmployees.length > 0 ? amount / row.selectedEmployees.length : 0,
        })),
        approval_required: false,
        approval_status: 'not_required',
        status: status === 'draft' ? 'draft' : 'posted',
        entered_by: state.user.name,
      };
      
      const { error } = await mongoDb.from('expense_entries').insert(payload);
      if (error) errors.push(error.message);
    }

    // FIX: Optimized state update - calculate in memory instead of a separate DB call
    if (session && status !== 'draft') {
      const newPostedAmount = (session.posted_expense_amount || 0) + totalAmount;
      await mongoDb.from('cash_sessions').update({
        posted_expense_amount: newPostedAmount,
        system_balance: session.system_balance - totalAmount, // Calculated directly
        updated_at: new Date().toISOString(),
      }).eq('id', session.id);
    }

    if (errors.length === 0) {
      notify(`Template batch ${status === 'draft' ? 'saved' : 'submitted'} — ${validRows.length} entries`);
      navigate('expenses/my');
    } else {
      notify(`${errors.length} errors occurred`, 'error');
    }
    
    setSubmitting(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;

  return (
    <div className="page-transition">
      <div className="page-header">
        <div>
          <h1 className="page-title">Template Entry</h1>
          <p className="page-subtitle">Fast batch expense entry using templates</p>
        </div>
        <button onClick={() => navigate('expenses/my')} className="btn-secondary"><X size={15} /> Cancel</button>
      </div>

      {/* Header Form */}
      <div className="card p-5 mb-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Template *</label>
            <select className="select" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
              <option value="">Select template</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.template_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cost Center *</label>
            <select className="select" value={selectedCostCenter} onChange={e => setSelectedCostCenter(e.target.value)}>
              <option value="">Select cost center</option>
              {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={businessDate} readOnly />
          </div>
        </div>
        
        {session && (
          <div className="mt-3 p-3 bg-emerald-50 rounded-xl text-sm text-emerald-700 flex items-center justify-between">
            <span>Available Cash: <strong>{formatCurrency(session.system_balance)}</strong></span>
            {totalAmount > 0 && (
              <span>After Submission: <strong>{formatCurrency(session.system_balance - totalAmount)}</strong></span>
            )}
          </div>
        )}
      </div>

      {/* Template Rows */}
      {rows.length > 0 && (
        <div className="card overflow-hidden mb-5">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Expense Rows</h3>
            <span className="text-sm text-slate-500">{rows.length} rows • {formatCurrency(totalAmount)} total</span>
          </div>
          
          <div className="divide-y divide-slate-100">
            {rows.map(row => {
              const amount = parseFloat(row.amount) || 0;
              const perHead = row.selectedEmployees.length > 0 ? amount / row.selectedEmployees.length : 0;
              
              return (
                <div key={row.rowId} className="p-4">
                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{row.categoryName}</p>
                      <p className="font-semibold text-slate-800">{row.expenseName}</p>
                    </div>
                    <div>
                      <label className="label">Amount (₹)</label>
                      <input
                        type="number"
                        className="input"
                        placeholder="0"
                        value={row.amount}
                        onChange={e => updateRow(row.rowId, { amount: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Remarks</label>
                      <input
                        className="input"
                        value={row.remarks}
                        onChange={e => updateRow(row.rowId, { remarks: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  {row.employeeRequired && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users size={13} className="text-blue-600" />
                        <label className="label mb-0">Select Employees</label>
                        {perHead > 0 && (
                          <span className="ml-auto text-xs text-blue-600 font-semibold">
                            Per head: {formatCurrency(perHead)} × {row.selectedEmployees.length}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {employees.map(emp => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => toggleEmployee(row.rowId, emp.id)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                              row.selectedEmployees.includes(emp.id)
                                ? 'bg-blue-100 border-blue-300 text-blue-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-200'
                            }`}
                          >
                            {emp.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Amount</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => submitBatch('draft')} disabled={submitting} className="btn-secondary">
                <Save size={15} /> Save Draft
              </button>
              <button onClick={() => submitBatch('submitted')} disabled={submitting} className="btn-primary">
                <Send size={15} /> {submitting ? 'Submitting...' : 'Submit Batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTemplate && rows.length === 0 && (
        <div className="card text-center py-12">
          <Receipt size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No rows found in this template</p>
        </div>
      )}

      {!selectedTemplate && (
        <div className="card text-center py-16">
          <Receipt size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium text-lg">Select a Template</p>
          <p className="text-slate-400 text-sm mt-1">Choose a template to load pre-configured expense rows</p>
        </div>
      )}
    </div>
  );
}