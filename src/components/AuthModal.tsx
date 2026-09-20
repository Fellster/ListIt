import React, { useState } from 'react';
import { useAuth, getAvatarColor, getInitials } from '../context/AuthContext';
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  X, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin' }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsDemoUser, user, userProfile } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const currentEmail = (userProfile?.email || user?.email || '').toLowerCase().trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your name');
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.toLowerCase().includes('popup-closed-by-user') ||
        err?.message?.toLowerCase().includes('popup window closed')
      ) {
        return;
      }
      setError(err.message || 'Google sign-in was not completed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoName: string, demoEmail: string) => {
    setError('');
    setLoading(true);
    try {
      await signInAsDemoUser(demoName, demoEmail);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to switch demo user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-sheet-title"
        className="relative w-full max-w-[460px] bg-[#fbfbfd] dark:bg-[#1c1c1e] text-slate-900 dark:text-slate-100 rounded-[28px] shadow-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden flex flex-col max-h-[88vh] tracking-tight antialiased animate-in zoom-in-95 duration-200"
      >
        {/* Apple-style Navigation Bar */}
        <div className="relative px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.07] bg-white/70 dark:bg-[#242426]/70 backdrop-blur-xl">
          <div className="w-7" /> {/* Left balance spacer */}
          
          <h2 id="auth-sheet-title" className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            {mode === 'signin' ? (
              <>
                <LogIn className="w-4 h-4 text-[#0071e3]" />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-[#0071e3]" />
                <span>Create Account</span>
              </>
            )}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="w-7 h-7 rounded-full bg-slate-200/60 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all active:scale-90 disabled:opacity-40"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-[13px] leading-normal">
          {/* Header Brand / App Card */}
          <div className="bg-white dark:bg-[#252528] rounded-2xl p-3.5 shadow-xs border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center text-[#0071e3] shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                ListIt Account
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {mode === 'signin' ? 'Welcome Back' : 'Get Started'}
              </h3>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium bg-slate-100 dark:bg-white/[0.08] px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Real-Time</span>
            </div>
          </div>

          {/* Mode Switcher Segmented Control */}
          <div className="bg-white dark:bg-[#252528] rounded-2xl p-1 shadow-xs border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signin'
                  ? 'bg-slate-100 dark:bg-white/[0.12] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signup'
                  ? 'bg-slate-100 dark:bg-white/[0.12] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 flex items-center gap-2 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="truncate">{error}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white dark:bg-[#252528] hover:bg-slate-50 dark:hover:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-[13px] font-semibold text-slate-800 dark:text-white shadow-xs transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Apple Inset Divider */}
          <div className="relative flex items-center justify-center py-0.5">
            <div className="border-t border-black/[0.06] dark:border-white/[0.08] w-full" />
            <span className="bg-[#fbfbfd] dark:bg-[#1c1c1e] px-3 text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider shrink-0">
              Or with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-normal px-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full pl-10 pr-3.5 py-2 bg-white dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] rounded-xl text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition shadow-xs"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-normal px-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3.5 py-2 bg-white dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] rounded-xl text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition shadow-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-normal px-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3.5 py-2 bg-white dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] rounded-xl text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition shadow-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-[13px] rounded-2xl shadow-xs transition active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-1"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'signin' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher - iOS Inset List Style */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tracking-normal uppercase">
                Demo Accounts
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                1-Tap Persona Switch
              </span>
            </div>

            <div className="bg-white dark:bg-[#252528] rounded-2xl p-2.5 shadow-xs border border-black/[0.04] dark:border-white/[0.06] space-y-1.5">
              {[
                { name: 'Alex Rivera', email: 'alex.owner@example.com', role: 'Owner' },
                { name: 'Jordan Taylor', email: 'jordan.invited@example.com', role: 'Invited Member' },
              ].map((account) => {
                const isSelected = currentEmail === account.email.toLowerCase();
                const avatarBg = getAvatarColor(account.email);
                const initials = getInitials(account.name);

                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => handleQuickDemo(account.name, account.email)}
                    disabled={loading}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition text-left active:scale-[0.99] ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08]'
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0 shadow-xs"
                        style={{ backgroundColor: avatarBg }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          <span>{account.name}</span>
                          <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                            ({account.role})
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {account.email}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#0071e3] font-medium flex items-center gap-0.5">
                          <span>Switch</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
