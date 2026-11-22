import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Moon,
  Phone,
  ShoppingBag,
  Sun,
} from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext.tsx';
import { normalizeEnglishDigits } from '../utils/stock.ts';
import { normalizePhone } from '../utils/subscription.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface PhonePinLoginScreenProps {
  title?: string;
  subtitle?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  backHref?: string;
  backLabel?: string;
}

export const PhonePinLoginScreen: React.FC<PhonePinLoginScreenProps> = ({
  title = 'چوونەژوور بۆ کەتەلۆگێ سەفرا',
  subtitle = 'ژمارەیا موبایلێ و کۆدێ 6 ژمارەیی (PIN) بنڤیسە',
  theme,
  onToggleTheme,
  backHref,
  backLabel,
}) => {
  const { loginPhonePin, authError, clearAuthError } = useFirebase();

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedError = localError || authError || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearAuthError();

    const cleanPhone = normalizePhone(phone);
    const cleanPin = normalizeEnglishDigits(pin).replace(/[^0-9]/g, '');

    if (cleanPhone.length < 7) {
      setLocalError('هیڤیدارین ژمارەیا موبایلێ ب دروستی بنڤیسە');
      return;
    }

    if (cleanPin.length < 6) {
      setLocalError('کۆدێ نهێنی (PIN) پێتڤیە 6 ژمارە بیت');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginPhonePin(cleanPhone, cleanPin);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setLocalError('ژمارەیا موبایلێ یان کۆدێ نهێنی (PIN) خەلەتە!');
      } else if (code === 'auth/too-many-requests') {
        setLocalError('گەلەک هەولدان هاتنە کرن، پاش چەند خولەکان دوبارە هەول بدە');
      } else if (code === 'auth/operation-not-allowed') {
        setLocalError('پێدڤیە چوونەژوور ب Email/Password د Firebase Console دا بهێتە چالاککرن');
      } else {
        setLocalError('چوونەژوور سەرنەکەفت، دوبارە هەول بدە');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f7ff] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle Royal Blue Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-sky-400/20 dark:bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-400/20 dark:bg-indigo-500/10 blur-3xl" />

      {/* Top Action Bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 z-10 gap-2">
        <div className="flex items-center gap-2">
          {backHref && backLabel && (
            <a
              href={backHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-white text-xs font-bold shadow-sm transition-all"
            >
              <span>{backLabel}</span>
            </a>
          )}
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

      {/* Main Glass Login Card */}
      <div className="w-full max-w-md rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-sky-100 dark:border-slate-800 shadow-2xl shadow-sky-900/10 p-6 sm:p-8 z-10 text-right">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0284c7] to-blue-700 flex items-center justify-center text-white shadow-lg shadow-sky-600/30 mb-3">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{subtitle}</p>
        </div>

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
          {/* Phone Number */}
          <div>
            <label
              htmlFor="login-phone-input"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              ژمارەیا موبایلێ
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="login-phone-input"
                type="tel"
                inputMode="tel"
                dir="ltr"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(normalizeEnglishDigits(e.target.value))}
                placeholder="0750 000 0000"
                className="w-full pr-10 pl-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono text-right text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>
          </div>

          {/* 6-digit PIN */}
          <div>
            <label
              htmlFor="login-pin-input"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              کۆدێ نهێنی (6 ژمارە PIN)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="login-pin-input"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                dir="ltr"
                maxLength={6}
                autoComplete="current-password"
                required
                value={pin}
                onChange={(e) =>
                  setPin(normalizeEnglishDigits(e.target.value).replace(/[^0-9]/g, '').slice(0, 6))
                }
                placeholder="••••••"
                className="w-full pr-10 pl-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono tracking-widest text-right text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
              <button
                type="button"
                onClick={() => setShowPin((prev) => !prev)}
                aria-label={showPin ? 'ڤەشارتنا کۆدی' : 'دیارکرنا کۆدی'}
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
