import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Wallet, PlusCircle, FileText, CheckSquare,
  BarChart2, Settings, ChevronDown, BookOpen,
  Tags, Shield, CalendarCheck, Truck,
  Users, Bot, TrendingUp, Receipt, Building2
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { UserRole } from '../../types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
    roles: ['admin', 'accounts', 'outlet_incharge', 'driver_supervisor', 'manager', 'owner', 'auditor'],
  },
  {
    id: 'masters',
    label: 'Masters',
    icon: <BookOpen size={18} />,
    roles: ['admin', 'accounts'],
    children: [
      { id: 'masters/categories', label: 'Expense Categories', icon: <Tags size={16} />, roles: ['admin', 'accounts'] },
      { id: 'masters/expense-names', label: 'Expense Names', icon: <FileText size={16} />, roles: ['admin', 'accounts'] },
      { id: 'masters/templates', label: 'Templates', icon: <Receipt size={16} />, roles: ['admin', 'accounts'] },
      { id: 'masters/approval-rules', label: 'Approval Rules', icon: <Shield size={16} />, roles: ['admin'] },
     // { id: 'masters/cost-centers', label: 'Cost Centers', icon: <Building2 size={16} />, roles: ['admin'] },
    ],
  },
  {
    id: 'cash',
    label: 'Cash Management',
    icon: <Wallet size={18} />,
    roles: ['admin', 'accounts', 'outlet_incharge', 'manager'],
    children: [
      { id: 'cash/opening', label: 'Opening Cash', icon: <span className="text-sm font-bold">₹</span>, roles: ['admin', 'accounts'] },
      { id: 'cash/day-closing', label: 'Day Closing', icon: <CalendarCheck size={16} />, roles: ['admin', 'accounts', 'outlet_incharge'] },
    ],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: <PlusCircle size={18} />,
    roles: ['admin', 'accounts', 'outlet_incharge', 'driver_supervisor', 'manager'],
    children: [
      { id: 'expenses/add', label: 'Petty Cash Expense', icon: <PlusCircle size={16} />, roles: ['admin', 'accounts', 'outlet_incharge', 'driver_supervisor'] },
       { id: 'expenses/bank', label: 'Bank Expense', icon: <Building2 size={16} />, roles: ['admin', 'accounts', 'outlet_incharge'] },
      { id: 'expenses/template', label: 'Template Entry', icon: <Receipt size={16} />, roles: ['admin', 'accounts', 'outlet_incharge'] },
    // { id: 'expenses/driver', label: 'Driver Expense', icon: <Truck size={16} />, roles: ['admin', 'accounts', 'driver_supervisor'] },
      { id: 'expenses/my', label: 'My Expenses', icon: <FileText size={16} />, roles: ['admin', 'accounts', 'outlet_incharge', 'driver_supervisor'] },
    ],
  },
  {
    id: 'approvals',
    label: 'Approvals',
    icon: <CheckSquare size={18} />,
    roles: ['admin', 'accounts', 'manager', 'owner'],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <BarChart2 size={18} />,
    roles: ['admin', 'accounts', 'manager', 'owner', 'auditor'],
    children: [
      { id: 'reports/daily', label: 'Daily Expense', icon: <TrendingUp size={16} />, roles: ['admin', 'accounts', 'manager', 'owner', 'auditor'] },
      { id: 'reports/cash-balance', label: 'Cash Balance', icon: <Wallet size={16} />, roles: ['admin', 'accounts', 'manager', 'owner'] },
      { id: 'reports/category', label: 'Category-wise', icon: <Tags size={16} />, roles: ['admin', 'accounts', 'manager', 'owner'] },
      { id: 'reports/employee-food', label: 'Employee Food', icon: <Users size={16} />, roles: ['admin', 'accounts', 'manager', 'owner'] },
      { id: 'reports/driver', label: 'Driver Expense', icon: <Truck size={16} />, roles: ['admin', 'accounts', 'manager', 'owner'] },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings size={18} />,
    roles: ['admin'],
  },
];

/** Flyout panel shown when a grouped nav item is clicked in compact (icon-only) mode. */
function CompactFlyout({
  item,
  onNavigate,
  onClose,
}: {
  item: NavItem;
  onNavigate: (id: string) => void;
  onClose: () => void;
}) {
  const { state } = useApp();
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-full top-0 ml-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200/80 py-2 z-50 slide-in">
        <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{item.label}</p>
        {item.children?.filter(c => c.roles.includes(state.user.role)).map(child => (
          <button
            key={child.id}
            onClick={() => { onNavigate(child.id); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
              state.currentPage === child.id
                ? 'bg-[var(--brand-50)] text-[var(--brand-700)] font-medium'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className={state.currentPage === child.id ? 'text-[var(--brand-600)]' : 'text-slate-400'}>
              {child.icon}
            </span>
            {child.label}
          </button>
        ))}
      </div>
    </>
  );
}

function NavItemComponent({
  item,
  level = 0,
  compact,
  flyoutOpenId,
  setFlyoutOpenId,
}: {
  item: NavItem;
  level?: number;
  compact: boolean;
  flyoutOpenId: string | null;
  setFlyoutOpenId: (id: string | null) => void;
}) {
  const { state, navigate } = useApp();
  const [expanded, setExpanded] = useState(() =>
    item.children?.some(c => state.currentPage === c.id || state.currentPage.startsWith(c.id))
  );

  const isActive = state.currentPage === item.id;
  const isChildActive = item.children?.some(c => state.currentPage === c.id);

  if (!item.roles.includes(state.user.role)) return null;

  // Icon-only rail mode — only applies to top-level items. Nested items
  // (rendered inside the flyout or inline expand) always show full labels.
  if (compact && level === 0) {
    if (item.children) {
      const isOpen = flyoutOpenId === item.id;
      return (
        <div className="relative mb-0.5 group">
          <button
            onClick={() => setFlyoutOpenId(isOpen ? null : item.id)}
            className={`w-full flex items-center justify-center py-2.5 rounded-lg transition-colors duration-200 ${
              isChildActive || isOpen
                ? 'bg-[var(--brand-50)] text-[var(--brand-600)]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
            aria-label={item.label}
          >
            {item.icon}
          </button>
          <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-md bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
            {item.label}
          </span>
          {isOpen && (
            <CompactFlyout item={item} onNavigate={navigate} onClose={() => setFlyoutOpenId(null)} />
          )}
        </div>
      );
    }

    return (
      <div className="relative mb-0.5 group">
        <button
          onClick={() => navigate(item.id)}
          className={`w-full flex items-center justify-center py-2.5 rounded-lg transition-colors duration-200 ${
            isActive ? 'bg-[var(--brand-600)] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
          aria-label={item.label}
        >
          {item.icon}
        </button>
        <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-md bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
          {item.label}
        </span>
      </div>
    );
  }

  // Full (expanded) mode — original behavior, unchanged
  if (item.children) {
    return (
      <div className="mb-0.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
            isChildActive
              ? 'bg-[var(--brand-50)] text-[var(--brand-600)]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
          style={{ paddingLeft: `${12 + level * 12}px` }}
        >
          <span className={`transition-colors duration-200 ${isChildActive ? 'text-[var(--brand-600)]' : 'text-slate-400'}`}>
            {item.icon}
          </span>
          <span className="flex-1 text-left text-[13.5px]">{item.label}</span>
          <span className={`text-slate-400 transition-transform duration-300 ${expanded ? 'rotate-0' : '-rotate-90'}`}>
            <ChevronDown size={14} />
          </span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="mt-1 ml-3 pl-3 border-l border-slate-100 space-y-0.5">
            {item.children.map(child => (
              <NavItemComponent
                key={child.id}
                item={child}
                level={level + 1}
                compact={false}
                flyoutOpenId={flyoutOpenId}
                setFlyoutOpenId={setFlyoutOpenId}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => navigate(item.id)}
      className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-[13.5px] font-medium transition-all duration-200 ${
        isActive
          ? 'bg-[var(--brand-600)] text-white shadow-sm'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
      }`}
      style={{ paddingLeft: `${12 + level * 12}px` }}
    >
      <span className={isActive ? 'text-white' : 'text-slate-400'}>
        {item.icon}
      </span>
      <span className="flex-1 text-left">{item.label}</span>
    </button>
  );
}

export function Sidebar() {
  const { state, dispatch } = useApp();
  const compact = state.theme.sidebarCompact;
  const [flyoutOpenId, setFlyoutOpenId] = useState<string | null>(null);

  // Close any open flyout if compact mode is turned off mid-session
  useEffect(() => {
    if (!compact) setFlyoutOpenId(null);
  }, [compact]);

  return (
    <aside
      className="fixed top-0 left-0 h-full bg-white border-r border-slate-200/80 z-40 flex flex-col shadow-sm transition-[width] duration-300"
      style={{ width: 'var(--sidebar-width)' }}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-slate-200 flex-shrink-0 ${compact ? 'justify-center px-2' : 'gap-3 px-5'}`}>
        <div className="w-8 h-8 bg-[var(--brand-600)] rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm">Y</span>
        </div>
        {!compact && (
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm leading-tight">YEN-EXPENSE</p>
            <p className="text-xs text-slate-400 leading-tight">YENERP | VMASOFT</p>
          </div>
        )}
      </div>

      {/* Navigation - Scrollbar Hidden */}
      <nav className={`flex-1 overflow-y-auto py-4 space-y-1 hide-scrollbar ${compact ? 'px-2' : 'px-3'}`}>
        {NAV_ITEMS.map(item => (
          <NavItemComponent
            key={item.id}
            item={item}
            compact={compact}
            flyoutOpenId={flyoutOpenId}
            setFlyoutOpenId={setFlyoutOpenId}
          />
        ))}
      </nav>

      {/* AI Agent button */}
      <div className={`border-t border-slate-200 flex-shrink-0 ${compact ? 'p-2' : 'p-3'}`}>
        <div className="relative group">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_AI_AGENT' })}
            className={`w-full flex items-center rounded-lg text-sm font-medium transition-all duration-200 ${
              compact ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
            } ${
              state.aiAgentOpen
                ? 'bg-[var(--brand-600)] text-white shadow-sm'
                : 'bg-[var(--brand-50)] text-[var(--brand-700)] hover:bg-[var(--brand-100)]'
            }`}
            aria-label="AI Agent"
          >
            <Bot size={18} className={state.aiAgentOpen ? 'ai-pulse' : ''} />
            {!compact && <span className="text-[13.5px]">AI Agent</span>}
          </button>
          {compact && (
            <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-md bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
              AI Agent
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}