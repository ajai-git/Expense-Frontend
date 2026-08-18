import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Receipt,
  CreditCard,
  FileSpreadsheet,
  Sparkles,
  Check,
  Clock,
  X,
  ArrowUpRight,
  TrendingUp,
  Banknote,
} from 'lucide-react';
import { AppUser } from '../../store/AppContext';

interface LoginProps {
  onLogin: (user: AppUser) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1400));
    
    if (formData.email && formData.password) {
      setIsSuccess(true);
      const name = formData.email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const userData: AppUser = { id: '1', name: name || 'User', role: 'admin' };
      setTimeout(() => onLogin(userData), 500);
    } else {
      setError('Enter both your work email and password to continue.');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-root h-screen w-screen flex overflow-hidden login-surface">
      
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-[54%] relative overflow-hidden flex-col login-panel-bg">
        <div className="absolute -top-48 -right-24 w-[520px] h-[520px] rounded-full blur-[140px] pointer-events-none login-glow-tr" />
        <div className="absolute bottom-[-10%] left-[-8%] w-[360px] h-[360px] rounded-full blur-[110px] pointer-events-none login-glow-bl" />
        <div className="absolute inset-0 pointer-events-none login-dot-grid" />

        <div className="relative z-10 flex flex-col w-full px-12 xl:px-16 py-12 xl:py-14 flex-1">
          
          <div className="flex items-center gap-3 h-10">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center border login-logo-icon">
              <Banknote className="w-5 h-5" strokeWidth={1.6} />
            </div>
            <div className="leading-none">
              <span className="login-serif text-[17px] font-semibold text-white tracking-tight block">YenERP</span>
              <span className="block text-[9.5px] text-white/35 uppercase tracking-[0.2em] mt-1 font-medium">Expense Management</span>
            </div>
          </div>

          <div className="h-10 xl:h-12" />

          <h1 className="login-serif text-white text-[32px] xl:text-[38px] font-medium leading-[1.2] tracking-[-0.01em] max-w-[440px]">
            Submit, approve, and reconcile <br/>
            <span className="login-headline-accent">in seconds.</span>
          </h1>
          <p className="text-white/40 text-[14.5px] leading-relaxed mt-3 max-w-[380px]">
            See how AI captures receipts, enforces policy, and routes approvals automatically.
          </p>

          <div className="h-8" />

          {/* MAIN CARD */}
          <div className="rounded-2xl border overflow-hidden flex-1 flex flex-col login-illust-card">
            
            <div className="flex items-center gap-0 border-b px-5 login-illust-border">
              {['Pending', 'Approved', 'Rejected'].map((tab, i) => (
                <button key={tab} className={`text-[11px] font-semibold px-4 py-3 transition-colors relative ${i === 0 ? 'login-tab-active' : 'login-tab-inactive'}`}>
                  {tab}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1 border login-ai-badge">
                  <Sparkles className="w-3 h-3" />
                  <span className="text-[9px] font-semibold">AI Active</span>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-hidden">
              
              {/* Item 1: AI Scanning */}
              <div className="rounded-xl border p-4 flex gap-4 items-start relative overflow-hidden login-expense-item-active">
                <div className="login-expense-accent-bar" />
                <div className="w-12 h-14 rounded-lg flex flex-col items-center justify-center gap-1 shrink-0 border border-dashed login-thumb-active">
                  <Receipt className="w-5 h-5 login-pulse-anim" style={{ animation: 'login-pulse 1.5s infinite' }} strokeWidth={1.4} />
                  <span className="text-[6px] font-mono text-inherit opacity-60">PDF</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px] font-semibold text-white/90 truncate">YENERP-ENTERPRISE RESOURCE PLANNING</p>
                    <span className="login-mono text-[13px] font-semibold text-white shrink-0 ml-2">$2,450.00</span>
                  </div>
                  <p className="text-[10px] text-white/30 mb-2">Uploaded just now • john.doe@company.com</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/[0.08]">
                      <div className="h-full rounded-full bg-[var(--brand-500)] login-progress-anim" style={{ animation: 'login-progress 2s ease-in-out infinite' }} />
                    </div>
                    <span className="text-[8px] font-semibold shrink-0" style={{ color: 'var(--brand-400)' }}>Parsing...</span>
                  </div>
                </div>
              </div>

              {/* Item 2: Policy Violation */}
              <div className="rounded-xl border p-4 flex gap-4 items-start login-expense-item">
                <div className="w-12 h-14 rounded-lg flex flex-col items-center justify-center gap-1 shrink-0 border login-thumb-default">
                  <CreditCard className="w-5 h-5" strokeWidth={1.4} />
                  <span className="text-[6px] font-mono text-inherit opacity-60">CARD</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px] font-semibold text-white/90 truncate">Uber Ride - Client Visit</p>
                    <span className="login-mono text-[13px] font-semibold text-white shrink-0 ml-2">$84.50</span>
                  </div>
                  <p className="text-[10px] text-white/30 mb-2.5">Dec 14, 2024 • Expired Policy Check</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 border text-[8px] font-bold login-violation-tag">
                      <X className="w-2.5 h-2.5" /> EXCEEDS LIMIT
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 border text-[8px] font-bold login-violation-tag">
                      <Clock className="w-2.5 h-2.5" /> LATE SUBMISSION
                    </span>
                  </div>
                </div>
              </div>

              {/* Item 3: Ready to Approve */}
              <div className="rounded-xl border p-4 flex gap-4 items-start login-expense-item">
                <div className="w-12 h-14 rounded-lg flex flex-col items-center justify-center gap-1 shrink-0 border login-thumb-default">
                  <FileSpreadsheet className="w-5 h-5" strokeWidth={1.4} />
                  <span className="text-[6px] font-mono text-inherit opacity-60">XLSX</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px] font-semibold text-white/90 truncate">Q3 Team Offsite Meals</p>
                    <span className="login-mono text-[13px] font-semibold text-white shrink-0 ml-2">$1,240.00</span>
                  </div>
                  <p className="text-[10px] text-white/30 mb-2.5">Dec 12, 2024 • sarah.smith@company.com</p>
                  <div className="flex items-center gap-3">
                    {['Receipt Matched', 'Within Policy', 'Duplicate Checked'].map((t) => (
                      <div key={t} className="flex items-center gap-1 text-[8px] text-white/40">
                        <div className="w-3 h-3 rounded-full flex items-center justify-center login-compliant-dot">
                          <Check className="w-2 h-2" strokeWidth={3} />
                        </div>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
                <button type="button" className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-all login-approve-btn">
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>

            </div>

            <div className="flex items-center justify-between px-5 py-3.5 border-t login-summary-bar">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[9px] text-white/30 uppercase tracking-wider font-semibold">Pending Action</p>
                  <p className="login-mono text-white text-[15px] font-semibold">24</p>
                </div>
                <div>
                  <p className="text-[9px] text-white/30 uppercase tracking-wider font-semibold">Total Value</p>
                  <p className="login-mono text-white text-[15px] font-semibold">$18,450</p>
                </div>
              </div>
              <button type="button" className="flex items-center gap-1.5 text-[11px] font-semibold transition-colors login-view-all">
                View All <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* FLOATING CARDS */}
          <div className="absolute top-[16%] right-6 xl:right-10 w-[180px] rounded-xl border p-3.5 shadow-2xl login-float-card">
            <p className="text-[8.5px] text-white/35 uppercase tracking-wider font-semibold mb-3">Approval Route</p>
            <div className="flex items-center">
              {['JD', 'SK', 'AM'].map((name, i) => (
                <div key={name} className="relative">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 ${i === 0 ? 'login-avatar-active' : i === 1 ? 'login-avatar-done' : 'login-avatar-pending'}`} style={{ marginLeft: i !== 0 ? '-6px' : '0', zIndex: 3 - i }}>
                    {name}
                  </div>
                  {i < 2 && (
                    <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 z-[4]">
                      <Check className="w-2.5 h-2.5 text-white bg-green-500 rounded-full p-0.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-white/40 mt-2.5">2 of 3 approved</p>
            <div className="mt-2 h-1 rounded-full overflow-hidden bg-white/[0.08]">
              <div className="h-full rounded-full bg-[var(--brand-500)]" style={{ width: '66%' }} />
            </div>
          </div>

          <div className="absolute bottom-[14%] right-8 xl:right-12 rounded-xl border p-3.5 shadow-2xl login-float-card-alt">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[8.5px] text-white/35 uppercase tracking-wider font-semibold">Q4 Budget</p>
              <div className="flex items-center gap-1 text-green-400">
                <TrendingUp className="w-3 h-3" />
                <span className="text-[9px] font-bold">On Track</span>
              </div>
            </div>
            <p className="login-mono text-white text-[18px] font-medium leading-none">$142K <span className="text-[11px] text-white/25 font-normal">/ $200K</span></p>
            <div className="mt-2.5 flex items-center gap-0.5 h-2 rounded-full overflow-hidden bg-white/[0.08]">
              <div className="h-full rounded-l-full login-budget-bar-main" style={{ width: '45%' }} />
              <div className="h-full login-budget-bar-sec" style={{ width: '26%' }} />
              <div className="h-full rounded-r-full bg-white/15" style={{ width: '5%' }} />
            </div>
            <div className="flex items-center justify-between mt-2 text-[7.5px] text-white/30 font-mono">
              <span>Travel 45%</span>
              <span>Ops 26%</span>
              <span>Misc 5%</span>
            </div>
          </div>

          <div className="flex-1 min-h-[40px]" />

          <div className="flex items-center gap-2.5 text-white/30">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" strokeWidth={1.6} />
            <p className="text-[11px] leading-snug">SOC 2 Type II · ISO 27001 · GDPR compliant</p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[46%] flex items-center justify-center p-6 sm:p-10 lg:p-14 xl:p-16 relative login-surface">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] pointer-events-none login-glow-form" />

        <div className="relative z-10 w-full max-w-[385px]">
          
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--brand-600)]">
              <Banknote className="w-5 h-5 text-white" strokeWidth={1.6} />
            </div>
            <div className="leading-none">
              <span className="login-serif text-[17px] font-semibold tracking-tight block login-form-text">YenERP</span>
              <span className="block text-[9.5px] uppercase tracking-[0.2em] mt-1 font-medium login-form-muted">Expense Management</span>
            </div>
          </div>

          <div className="mb-9">
            <h2 className="login-serif text-[26px] font-medium tracking-[-0.01em] leading-tight login-form-text">Sign in to your workspace</h2>
            <p className="mt-2 text-[14px] leading-relaxed login-form-muted">Use your company credentials to continue.</p>
          </div>

          {isSuccess && (
            <div className="login-success-box mb-5 p-4 rounded-lg flex items-center gap-3 border">
              <CheckCircle2 className="w-[18px] h-[18px] shrink-0 login-success-icon" strokeWidth={1.6} />
              <p className="text-[13px] font-medium login-success-text">Verified. Opening your workspace…</p>
            </div>
          )}

          {error && (
            <div className="login-error-box mb-5 p-4 rounded-lg flex items-center gap-3 border">
              <AlertCircle className="w-[18px] h-[18px] shrink-0 login-error-icon" strokeWidth={1.6} />
              <p className="text-[13px] font-medium login-error-text">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11.5px] font-semibold uppercase tracking-[0.06em] mb-2 login-form-label">Work email</label>
              <div className="relative group">
                <Mail className="login-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] transition-colors duration-150 login-form-muted" strokeWidth={1.6} />
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="login-input w-full pl-11 pr-4 py-3 border rounded-lg text-[14px] transition-all duration-150 outline-none" placeholder="name@company.com" required disabled={isLoading || isSuccess} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11.5px] font-semibold uppercase tracking-[0.06em] login-form-label">Password</label>
                <button type="button" className="login-brand-link text-[12px] font-medium transition-colors duration-150">Forgot password?</button>
              </div>
              <div className="relative group">
                <Lock className="login-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] transition-colors duration-150 login-form-muted" strokeWidth={1.6} />
                <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="login-input w-full pl-11 pr-11 py-3 border rounded-lg text-[14px] transition-all duration-150 outline-none" placeholder="Enter your password" required disabled={isLoading || isSuccess} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="login-toggle-pw absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-150" disabled={isLoading || isSuccess} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="w-[17px] h-[17px]" strokeWidth={1.6} /> : <Eye className="w-[17px] h-[17px]" strokeWidth={1.6} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" checked={formData.rememberMe} onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })} className="login-cb peer sr-only" disabled={isLoading || isSuccess} />
                  <div className="login-cb-box w-[16px] h-[16px] rounded-[4px] border-[1.5px] transition-all duration-150 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 opacity-0 peer-checked:opacity-100 transition-opacity duration-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-[13px] transition-colors login-form-muted">Keep me signed in</span>
              </label>
              <div className="flex items-center gap-1.5 text-[10.5px] login-mono login-form-muted">
                <ShieldCheck className="w-3 h-3" strokeWidth={1.6} />
                <span>AES-256</span>
              </div>
            </div>

            <button type="submit" disabled={isLoading || isSuccess} className="login-btn w-full py-3.5 font-medium text-[14px] rounded-lg transition-all duration-200 flex items-center justify-center gap-2.5 group disabled:opacity-50 disabled:cursor-not-allowed mt-2">
              {isLoading ? (
                <><Loader2 className="w-[18px] h-[18px] animate-spin" /><span>Verifying credentials…</span></>
              ) : isSuccess ? (
                <><CheckCircle2 className="w-[18px] h-[18px]" /><span>Verified</span></>
              ) : (
                <><span>Sign in</span><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" strokeWidth={1.6} /></>
              )}
            </button>
          </form>

          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px login-form-border" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold login-form-muted">or continue with</span>
            <div className="flex-1 h-px login-form-border" />
          </div>

          <button type="button" className="login-sso-btn w-full py-3 border font-medium text-[13.5px] rounded-lg transition-all duration-150 flex items-center justify-center gap-2.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect width="10" height="10" x="2" y="2" rx="1.5" fill="var(--brand-500)" />
              <rect width="10" height="10" x="12" y="2" rx="1.5" fill="var(--login-ink)" opacity="0.65" />
              <rect width="10" height="10" x="2" y="12" rx="1.5" fill="var(--login-ink)" opacity="0.4" />
              <rect width="10" height="10" x="12" y="12" rx="1.5" fill="var(--brand-400)" />
            </svg>
            Company SSO
          </button>

          <p className="mt-7 text-center text-[12px] login-form-muted">
            Need access? <button type="button" className="login-brand-link font-semibold hover:underline underline-offset-2 transition-colors duration-150">Contact your administrator</button>
          </p>
        </div>
      </div>
    </div>
  );
}