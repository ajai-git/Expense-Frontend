import React, { useState } from 'react';
import {
  Sun, Moon, Palette, Shield, Hash, Bell, Check,
  Clock, Calendar, FileText, Activity,
  Server, Database, Cloud, Cpu, HardDrive,
  Save
} from 'lucide-react';
import { useApp } from '../../store/AppContext';

type ThemeMode = 'light' | 'dark';
type PresetColor = 'blue' | 'teal' | 'emerald' | 'rose' | 'slate';

const THEME_COLORS: { id: PresetColor; label: string; bg: string }[] = [
  { id: 'blue', label: 'Ocean Blue', bg: 'bg-blue-500' },
  { id: 'teal', label: 'Teal Green', bg: 'bg-teal-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500' },
  { id: 'slate', label: 'Dark Slate', bg: 'bg-slate-500' },
];

const PERMISSION_CODES = [
  { code: 'expense.dashboard.view', desc: 'View dashboard', roles: ['all'] },
  { code: 'expense.master.manage', desc: 'Create/edit masters', roles: ['admin'] },
  { code: 'expense.opening_cash.create', desc: 'Create opening cash', roles: ['admin', 'accounts'] },
  { code: 'expense.entry.create', desc: 'Create expense', roles: ['admin', 'accounts', 'outlet_incharge', 'driver_supervisor'] },
  { code: 'expense.entry.edit_draft', desc: 'Edit draft expense', roles: ['admin', 'accounts', 'outlet_incharge'] },
  { code: 'expense.entry.reverse', desc: 'Reverse posted expense', roles: ['admin', 'accounts'] },
  { code: 'expense.approval.approve', desc: 'Approve expense', roles: ['admin', 'accounts', 'manager', 'owner'] },
  { code: 'expense.day_closing.create', desc: 'Submit day closing', roles: ['admin', 'accounts', 'outlet_incharge'] },
  { code: 'expense.day_closing.verify', desc: 'Verify and lock day closing', roles: ['admin', 'accounts'] },
  { code: 'expense.reports.view', desc: 'View reports', roles: ['admin', 'accounts', 'manager', 'owner', 'auditor'] },
  { code: 'expense.audit.view', desc: 'View audit logs', roles: ['admin', 'auditor'] },
];

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function Section({ title, icon, children, className = '' }: SectionProps) {
  return (
    <div className={`bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden ${className}`}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h2>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

export function Settings() {
  const { state, dispatch } = useApp();
  const [numbering, setNumbering] = useState({ 
    prefix: 'EXP', 
    separator: '-', 
    padLength: '4', 
    includeDate: true 
  });
  const [notifications, setNotifications] = useState({
    pendingApproval: true, 
    dayClosure: true, 
    missingReceipt: false, 
    variances: true
  });

  const isCustom = state.theme.color === 'custom';
  const customColorValue = state.theme.customColor ?? '#3B82F6';

  return (
    <div className="page-transition w-full">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              Settings
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure application preferences, permissions, and system settings
            </p>
          </div>
          <button 
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 hover:opacity-90"
            style={{ 
              background: 'var(--brand-600)', 
              color: 'white',
            }}
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Theme Section */}
          <Section title="Appearance & Theme" icon={<Palette size={16} />}>
            <div className="space-y-5">
              {/* Display Mode */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                  Display Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { mode: 'light' as ThemeMode, icon: <Sun size={16} />, label: 'Light' },
                    { mode: 'dark' as ThemeMode, icon: <Moon size={16} />, label: 'Dark' },
                  ].map(({ mode, icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => dispatch({ type: 'SET_THEME', payload: { mode } })}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        state.theme.mode === mode
                          ? 'border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)] shadow-sm dark:bg-[var(--brand-900)]/30 dark:text-[var(--brand-300)] dark:border-[var(--brand-400)]'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {icon} {label}
                      {state.theme.mode === mode && <Check size={14} className="text-[var(--brand-600)] dark:text-[var(--brand-400)]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                  Color Theme
                </label>
                <div className="flex flex-wrap gap-2">
                  {THEME_COLORS.map(tc => (
                    <button
                      key={tc.id}
                      onClick={() => dispatch({ type: 'SET_THEME', payload: { color: tc.id, customColor: undefined } })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                        state.theme.color === tc.id
                          ? 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${tc.bg}`} />
                      <span className="dark:text-slate-300">{tc.label}</span>
                      {state.theme.color === tc.id && <Check size={11} className="text-slate-600 dark:text-slate-300" />}
                    </button>
                  ))}

                  {/* Custom Color Picker */}
                  <label
                    className={`relative w-10 h-10 rounded-lg cursor-pointer border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isCustom
                        ? 'border-slate-400 dark:border-slate-500 ring-2 ring-offset-2 ring-[var(--brand-500)] shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    style={{
                      background: isCustom
                        ? customColorValue
                        : 'conic-gradient(from 0deg, #f43f5e, #f59e0b, #84cc16, #14b8a6, #3b82f6, #8b5cf6, #f43f5e)',
                    }}
                  >
                    <input
                      type="color"
                      value={customColorValue}
                      onChange={e =>
                        dispatch({ type: 'SET_THEME', payload: { color: 'custom', customColor: e.target.value } })
                      }
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label="Pick a custom theme color"
                    />
                    {isCustom && <Check size={14} className="text-white drop-shadow pointer-events-none" />}
                  </label>
                </div>
              </div>

              {/* Sidebar Compact */}
              <div className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Compact Sidebar</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Show icons only in sidebar</p>
                </div>
                <button
                  onClick={() => dispatch({ type: 'SET_THEME', payload: { sidebarCompact: !state.theme.sidebarCompact } })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${state.theme.sidebarCompact ? 'bg-[var(--brand-600)]' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-md ${state.theme.sidebarCompact ? 'left-[22px]' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </Section>

          {/* Numbering Section */}
          <Section title="Document Numbering" icon={<Hash size={16} />}>
            <div className="space-y-4">
              <div className="p-3 rounded-lg border" style={{ background: 'var(--brand-50)', borderColor: 'var(--brand-100)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--brand-700)' }}>Preview:</p>
                <p className="font-mono text-sm font-medium" style={{ color: 'var(--brand-700)' }}>
                  {numbering.prefix}{numbering.separator}
                  {numbering.includeDate ? '20260615' + numbering.separator : ''}
                  {'0001'.slice(0, parseInt(numbering.padLength) || 4).padStart(parseInt(numbering.padLength) || 4, '0')}
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Prefix</label>
                  <input
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent outline-none transition-all uppercase text-slate-800 dark:text-slate-200"
                    value={numbering.prefix}
                    onChange={e => setNumbering(p => ({ ...p, prefix: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Separator</label>
                  <select 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                    value={numbering.separator} 
                    onChange={e => setNumbering(p => ({ ...p, separator: e.target.value }))}
                  >
                    <option value="-">Hyphen (-)</option>
                    <option value="/">Slash (/)</option>
                    <option value="">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Pad Length</label>
                  <select 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                    value={numbering.padLength} 
                    onChange={e => setNumbering(p => ({ ...p, padLength: e.target.value }))}
                  >
                    {['3', '4', '5', '6'].map(n => <option key={n} value={n}>{n} digits</option>)}
                  </select>
                </div>
              </div>
              
              <label className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
                <input
                  type="checkbox"
                  checked={numbering.includeDate}
                  onChange={e => setNumbering(p => ({ ...p, includeDate: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-[var(--brand-600)] focus:ring-[var(--brand-500)] dark:bg-slate-800"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Include date in document number</span>
              </label>
            </div>
          </Section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Notifications Section */}
          <Section title="Notifications" icon={<Bell size={16} />}>
            <div className="space-y-1">
              {[
                { key: 'pendingApproval' as const, label: 'Pending Approval Alerts', desc: 'Notify when expenses need approval', icon: <Clock size={14} /> },
                { key: 'dayClosure' as const, label: 'Day Closure Reminders', desc: 'Remind at end of day if not closed', icon: <Calendar size={14} /> },
                { key: 'missingReceipt' as const, label: 'Missing Receipt Alerts', desc: 'Alert when receipt is overdue', icon: <FileText size={14} /> },
                { key: 'variances' as const, label: 'Variance Alerts', desc: 'Notify when cash variance detected', icon: <Activity size={14} /> },
              ].map(({ key, label, desc, icon }) => (
                <div key={key} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                      {icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifications(p => ({ ...p, [key]: !p[key] }))}
                    className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${notifications[key] ? 'bg-[var(--brand-600)]' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-md ${notifications[key] ? 'left-[22px]' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* System Status */}
          <Section title="System Status" icon={<Server size={16} />}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Database', status: 'Connected', icon: <Database size={14} />, color: 'emerald' },
                { label: 'API Server', status: 'Running', icon: <Cloud size={14} />, color: 'emerald' },
                { label: 'Cache', status: 'Active', icon: <Cpu size={14} />, color: 'emerald' },
                { label: 'Storage', status: '68% Used', icon: <HardDrive size={14} />, color: 'amber' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center 
                    ${item.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : ''}
                    ${item.color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : ''}
                  `}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.label}</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* Full Width - Permissions Section */}
      <div className="mt-6">
        <Section title="Permission Matrix" icon={<Shield size={16} />} className="w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-700/50">
                  <th className="text-left py-3 px-2 font-semibold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Permission
                  </th>
                  <th className="text-center py-3 px-2 font-semibold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Admin
                  </th>
                  <th className="text-center py-3 px-2 font-semibold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Accounts
                  </th>
                  <th className="text-center py-3 px-2 font-semibold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Incharge
                  </th>
                  <th className="text-center py-3 px-2 font-semibold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Manager
                  </th>
                  <th className="text-center py-3 px-2 font-semibold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Owner
                  </th>
                </tr>
              </thead>
              <tbody>
                {PERMISSION_CODES.map((p, index) => (
                  <tr 
                    key={p.code} 
                    className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                      index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/50 dark:bg-slate-800/20'
                    }`}
                  >
                    <td className="py-3 px-2">
                      <p className="font-mono text-xs font-semibold" style={{ color: 'var(--brand-700)' }}>
                        {p.code}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.desc}</p>
                    </td>
                    {['admin', 'accounts', 'outlet_incharge', 'manager', 'owner'].map(role => (
                      <td key={role} className="text-center py-3 px-2">
                        {p.roles.includes('all') || p.roles.includes(role) ? (
                          <div className="flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
                              <Check size={14} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}