import React, { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import type { AppUser } from './store/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Notification } from './components/layout/Notification';
import { AIAgent } from './components/ai/AIAgent';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Categories } from './pages/masters/Categories';
import { ExpenseNames } from './pages/masters/ExpenseNames';
import { Templates } from './pages/masters/Templates';
import { ApprovalRules } from './pages/masters/Approvalrules';
// import { CostCenters } from './pages/masters/Costcenters';
import { OpeningCash } from './pages/cash/OpeningCash';
import { DayClosing } from './pages/cash/DayClosing';
import { AddExpense } from './pages/expenses/AddExpense';
import { MyExpenses } from './pages/expenses/MyExpenses';
import { TemplateExpense } from './pages/expenses/TemplateExpense';
import { DriverExpense } from './pages/expenses/Driverexpense';
import { ApprovalQueue } from './pages/approvals/ApprovalQueue';
import { Reports } from './pages/reports/Reports';
import { Settings } from './pages/settings/Settings';
import { Login } from './components/auth/Login';

const SESSION_STORAGE_KEY = 'yenerp_user';

const ROUTES: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  'masters/categories': Categories,
  'masters/expense-names': ExpenseNames,
  'masters/templates': Templates,
  'masters/approval-rules': ApprovalRules,
 // 'masters/cost-centers': CostCenters,
  'cash/opening': OpeningCash,
  'cash/day-closing': DayClosing,
  'expenses/add': AddExpense,
  'expenses/my': MyExpenses,
  'expenses/template': TemplateExpense,
  'expenses/driver': DriverExpense,
  approvals: ApprovalQueue,
  'reports/daily': Reports,
  'reports/cash-balance': Reports,
  'reports/category': Reports,
  'reports/employee-food': Reports,
  'reports/driver': Reports,
  reports: Reports,
  settings: Settings,
};

/**
 * True when running under common dev-server conditions. Checks safely
 * for globals that different bundlers expose (Vite's import.meta.env,
 * Node/webpack's process.env) without assuming either exists, and
 * without using `any`. Defaults to true (warn) if neither global is
 * present, since silent routing bugs are worse than one extra log line.
 */
function isLikelyDevEnvironment(): boolean {
  const meta = import.meta as { env?: { DEV?: boolean } } | undefined;
  if (typeof meta?.env?.DEV === 'boolean') {
    return meta.env.DEV;
  }

  const proc = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
  if (proc?.env?.NODE_ENV) {
    return proc.env.NODE_ENV !== 'production';
  }

  return true;
}

function PageRouter() {
  const { state } = useApp();
  const { currentPage } = state;

  const PageComponent = ROUTES[currentPage];

  if (!PageComponent) {
    if (isLikelyDevEnvironment()) {
      // eslint-disable-next-line no-console
      console.warn(`[PageRouter] Unknown route "${currentPage}" — falling back to dashboard.`);
    }
    return <Dashboard />;
  }

  return <PageComponent />;
}

function readStoredUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch { /* empty */ }
    return null;
  }
}

function persistUser(user: AppUser): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  } catch { /* empty */ }
}

function clearStoredUser(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch { /* empty */ }
}

function FullScreenLoader({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
        <div className="w-12 h-12 border-4 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">{label}</p>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { dispatch } = useApp();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const storedUser = readStoredUser();
    if (storedUser) {
      dispatch({ type: 'SET_USER', payload: storedUser });
      setIsLoggedIn(true);
    }
    setIsCheckingSession(false);
  }, []);

  const handleLogin = useCallback(
    (user: AppUser) => {
      persistUser(user);
      dispatch({ type: 'SET_USER', payload: user });
      setIsLoggedIn(true);
    },
    [dispatch]
  );

  const handleLogout = useCallback(() => {
    clearStoredUser();
    dispatch({
      type: 'SET_USER',
      payload: { id: '', name: '', role: 'admin' },
    });
    setIsLoggedIn(false);
  }, [dispatch]);

  if (isCheckingSession) {
    return <FullScreenLoader label="Loading…" />;
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <div
        className="flex-1 flex flex-col min-h-screen transition-[margin-left] duration-300"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <Header onLogout={handleLogout} />
        <main className="flex-1 p-4 pt-20">
          <PageRouter />
        </main>
      </div>

      <AIAgent />
      <Notification />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AuthenticatedApp />
    </AppProvider>
  );
}