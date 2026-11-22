import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Moon,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext.tsx';
import { normalizeAdminUsername, validateCompanyAdminCredentials } from '../utils/subscription.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface AdminLoginScreenProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  notice?: string;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  theme,
  onToggleTheme,
  notice,
}) => {
  const { loginAdminCredentials, authError, clearAuthError } = useFirebase();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedError = localError || authError || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearAuthError();

    const validation = validateCompanyAdminCredentials(username, password);
    if (!validation.valid) {
      setLocalError(validation.error || 'ناڤێ بەکارهێنەری یان پاسوۆرد خەلەتە');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginAdminCredentials(validation.cleanUsername, password);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setLocalError('ناڤێ بەکارهێنەری یان پاسوۆرد خەلەتە!');
      } else if (code === 'auth/too-many-requests') {
        setLocalError('گەلەک هەولدان هاتنە کرن، پاش چەند خولەکان دوبارە هەول بدە');
      } else if (code === 'auth/operation-not-allowed') {
        setLocalError('پێتڤیە د Firebase Console دا چوونەژوور ب پاسوۆرد بهێتە چالاککرن (پەیوەندیێ ب سەرپەرشتیاری بکە)');
      } else {
        setLocalError('چوونەژوور سەرنەکەفت، دوبارە هەول بدە');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f7ff] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Ambient Royal Blue Glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-sky-400/20 dark:bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-400/20 dark:bg-indigo-500/10 blur-3xl" />

      {/* Top Bar: Catalog Link, PWA & Theme Toggle (NO link to /accounts) */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 z-10 gap-2">
        <div className="flex items-center gap-2">
          <a
            href="/index.html"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-white text-xs font-bold shadow-sm transition-all"
          >
            <span>کەتەلۆگێ فرۆشتنێ</span>
          </a>
          <PWAInstallButton compact />
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="گوهۆڕینا مۆدێ"
          className="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm"
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 text-indigo-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
        </button>
      </div>

      {/* Company Admin Glass Login Card */}
      <div className="w-full max-w-md rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-sky-100 dark:border-slate-800 shadow-2xl shadow-sky-900/10 p-6 sm:p-8 z-10 text-right">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0284c7] to-blue-700 flex items-center justify-center text-white shadow-lg shadow-sky-600/30 mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            چوونەژوور بۆ کۆنتڕۆلا کومگەهێ
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            پەنێلا ڕێڤەبرنا بەرهەمان، سعران و کۆگەها سەفرا (شەریکە)
          </p>
        </div>

        {notice && !displayedError && (
          <div className="mb-4 p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-[#0284c7] dark:text-sky-300 text-xs font-bold leading-relaxed">
            {notice}
          </div>
        )}

        {displayedError && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-bold flex items-start gap-2 leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{displayedError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label
              htmlFor="admin-username-input"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              ناڤێ بەکارهێنەری (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="admin-username-input"
                type="text"
                dir="ltr"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(normalizeAdminUsername(e.target.value))}
                placeholder="safra"
                className="w-full pr-10 pl-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono text-right text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="admin-password-input"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              پاسوۆرد (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pr-10 pl-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono text-right text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'ڤەشارتنا پاسوۆردی' : 'دیارکرنا پاسوۆردی'}
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-2xl bg-[#0284c7] hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-bold shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? 'پشکنین دهێتە کرن...' : 'چوونەژوور'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
