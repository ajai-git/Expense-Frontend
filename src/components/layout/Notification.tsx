import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useApp } from '../../store/AppContext';

export function Notification() {
  const { state, dispatch } = useApp();
  const { notification } = state;

  if (!notification) return null;

  const config = {
    success: { icon: <CheckCircle size={16} />, className: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    error: { icon: <XCircle size={16} />, className: 'bg-red-50 border-red-200 text-red-800' },
    info: { icon: <Info size={16} />, className: 'bg-blue-50 border-blue-200 text-blue-800' },
  }[notification.type];

  return (
    <div className={`fixed top-20 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium max-w-sm slide-in ${config.className}`}>
      {config.icon}
      <span className="flex-1">{notification.message}</span>
      <button onClick={() => dispatch({ type: 'CLEAR_NOTIFICATION' })} className="hover:opacity-70">
        <X size={14} />
      </button>
    </div>
  );
}
