import { Plus, Eye, Receipt, RefreshCw } from 'lucide-react';
import { TemplatesProvider, useTemplates } from '../../store/Templatesslice';
import { Modal } from '../../components/ui/Modal';

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

  const { items: templates, loading, saving, previewTemplate, addModalOpen, form } = state;

  return (
    <div className="page-transition">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expense Templates</h1>
          <p className="page-subtitle">Pre-configured expense entry patterns</p>
        </div>
        <div className="flex gap-3">
          <button onClick={refresh} className="btn-secondary"><RefreshCw size={15} /></button>
          <button onClick={openAddModal} className="btn-primary"><Plus size={15} /> New Template</button>
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
        ) : templates.map(t => (
          <div key={t.id} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Receipt size={20} className="text-blue-600" />
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {t.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h3 className="font-semibold text-slate-800 mb-0.5">{t.template_name}</h3>
            <p className="text-xs font-mono text-slate-400 mb-3">{t.template_code}</p>
            <p className="text-xs text-slate-500 mb-4">{t.rows?.length ?? 0} expense rows</p>
            <div className="space-y-1 mb-4">
              {(t.rows ?? []).slice(0, 3).map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{r.expense_name}</span>
                  {r.default_amount > 0 && (
                    <span className="font-medium text-slate-700">₹{r.default_amount.toLocaleString('en-IN')}</span>
                  )}
                </div>
              ))}
              {(t.rows?.length ?? 0) > 3 && (
                <p className="text-xs text-slate-400">+{(t.rows?.length ?? 0) - 3} more rows</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openPreview(t)} className="btn-secondary flex-1 justify-center text-xs py-1.5">
                <Eye size={13} /> Preview
              </button>
              <button
                onClick={() => toggleActive(t)}
                className={`flex-1 justify-center text-xs py-1.5 ${t.active ? 'btn-secondary' : 'btn-success'}`}
              >
                {t.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {previewTemplate && (
        <Modal open={true} onClose={closePreview} title={`Template: ${previewTemplate.template_name}`} size="md">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Code</p>
                <p className="font-mono font-semibold text-slate-800 mt-0.5">{previewTemplate.template_code}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Rows</p>
                <p className="font-semibold text-slate-800 mt-0.5">{previewTemplate.rows?.length ?? 0}</p>
              </div>
            </div>
            <div>
              <p className="label mb-2">Expense Rows</p>
              <div className="space-y-2">
                {previewTemplate.rows?.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{r.expense_name}</p>
                      <p className="text-xs text-slate-400">{r.category_name}</p>
                    </div>
                    {r.default_amount > 0 && (
                      <span className="text-sm font-bold text-blue-700">₹{r.default_amount.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      <Modal
        open={addModalOpen}
        onClose={closeAddModal}
        title="New Template"
        size="sm"
        footer={
          <>
            <button onClick={closeAddModal} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Template Code *</label>
            <input
              className="input uppercase"
              placeholder="e.g. DAILY_FOOD"
              value={form.template_code}
              onChange={e => setForm({ template_code: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label className="label">Template Name *</label>
            <input
              className="input"
              placeholder="Descriptive name"
              value={form.template_name}
              onChange={e => setForm({ template_name: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function Templates() {
  return (
    <TemplatesProvider>
      <TemplatesInner />
    </TemplatesProvider>
  );
}