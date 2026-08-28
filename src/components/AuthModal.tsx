import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Sparkles, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin' }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsDemoUser } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
        // User closed or dismissed the popup
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-xl p-1 rounded-full hover:bg-white/10"
          >
            &times;
          </button>
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-emerald-100" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === 'signin' ? 'Welcome Back to ListIt' : 'Create your ListIt Account'}
          </h2>
          <p className="text-emerald-100 text-sm mt-1">
            Real-time collaborative shopping & task lists with instant sharing.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium shadow-xs hover:shadow transition disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            Continue with Google
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-wider font-medium shrink-0">
              Or with email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Your Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Keith Fell"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <span>Processing...</span>
              ) : mode === 'signin' ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create Account
                </>
              )}
            </button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="text-center text-xs text-slate-500">
            {mode === 'signin' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold underline underline-offset-2"
                >
                  Create one now
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold underline underline-offset-2"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>

          {/* Quick Demo Switcher for Easy Real-Time Sharing Testing */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">Quick Demo Accounts</span>
              <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                1-Click test
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2.5">
              Switch personas instantly to test real-time collaboration & permission controls between owner and collaborators:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('Keith Fell', 'keithfell1@gmail.com')}
                className="text-left p-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg transition text-xs group"
              >
                <div className="font-medium text-slate-800 group-hover:text-emerald-700 flex items-center justify-between">
                  <span>Keith (Owner)</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-600 transition" />
                </div>
                <div className="text-[10px] text-slate-400 truncate">keithfell1@gmail.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('Alex Rivera', 'alex.rivera@example.com')}
                className="text-left p-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg transition text-xs group"
              >
                <div className="font-medium text-slate-800 group-hover:text-emerald-700 flex items-center justify-between">
                  <span>Alex (Collaborator)</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-600 transition" />
                </div>
                <div className="text-[10px] text-slate-400 truncate">alex.rivera@example.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
