import { useState } from 'react';
import { Bell, ChevronDown, User, LogOut, Sun, Moon } from 'lucide-react';
import { useApp } from '../../store/AppContext';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  accounts: 'Accounts User',
  outlet_incharge: 'Outlet Incharge',
  driver_supervisor: 'Driver Supervisor',
  manager: 'Manager',
  owner: 'Owner',
  auditor: 'Auditor',
};

interface HeaderProps {
  onLogout?: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  const { state, dispatch, navigate } = useApp();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });

  const handleSignOut = () => {
    setShowSignOutConfirm(true);
    setUserMenuOpen(false);
  };

  const confirmSignOut = () => {
    setShowSignOutConfirm(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <>
      <header className="fixed top-0 right-0 h-16 bg-white border-b border-slate-200/80 z-20 flex items-center px-6 gap-4 transition-[left] duration-300"
        style={{ left: 'var(--sidebar-width)' }}
      >
        {/* Date Display */}
        <span className="text-sm text-slate-500 hidden sm:block font-medium">{today}</span>

        <div className="flex-1" />

        {/* Cost center indicator */}
        {state.user.costCenterName && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[var(--brand-50)] rounded-lg border border-[var(--brand-100)]">
            <div className="w-2 h-2 bg-[var(--brand-500)] rounded-full" />
            <span className="text-sm font-medium text-[var(--brand-700)]">{state.user.costCenterName}</span>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={() => dispatch({ type: 'SET_THEME', payload: { mode: state.theme.mode === 'light' ? 'dark' : 'light' } })}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        >
          {state.theme.mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications */}
        <button
          onClick={() => navigate('approvals')}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors relative"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 bg-[var(--brand-600)] rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">{state.user.name ? state.user.name[0] : 'U'}</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{state.user.name || 'User'}</p>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{ROLE_LABELS[state.user.role] || 'User'}</p>
            </div>
            <ChevronDown size={14} className={`text-slate-400 hidden md:block transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <>
              {/* Invisible backdrop to close menu when clicking outside */}
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />

              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200/80 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Current User</p>
                  <div className="px-2.5 py-2 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-800">{state.user.name || 'User'}</p>
                    <p className="text-xs text-slate-500">{ROLE_LABELS[state.user.role] || 'User'}</p>
                    {/* {state.user.costCenterName && (
                      <p className="text-xs text-slate-500 mt-0.5">{state.user.costCenterName}</p>
                    )} */}
                  </div>
                </div>
                
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                  <User size={16} /> Profile Settings
                </button>
                
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>

        {/* Global style to hide scrollbar inside role switcher if it overflows */}
        <style>{`
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </header>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={32} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Sign Out</h3>
              <p className="text-slate-600 text-sm mb-6">
                Are you sure you want to sign out? You'll need to sign in again to access your account.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSignOut}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}