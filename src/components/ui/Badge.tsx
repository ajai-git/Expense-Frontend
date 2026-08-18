
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  pending_approval: { label: 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  clarification_required: { label: 'Clarify', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
  posted: { label: 'Posted', className: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
  reversed: { label: 'Reversed', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
  closed: { label: 'Closed', className: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400' },
  open: { label: 'Open', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
  locked: { label: 'Locked', className: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  verified: { label: 'Verified', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  closing_submitted: { label: 'Closing', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  not_required: { label: 'N/A', className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
};

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: BadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
  // Compact sizing matching the new CSS
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}

interface ColorBadgeProps {
  label: string;
  color?: string;
  className?: string;
}

export function ColorBadge({ label, color = '#3B82F6', className = '' }: ColorBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${className}`}
      style={{ backgroundColor: `${color}18`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}