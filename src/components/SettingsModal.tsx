import React from 'react';
import { X, Moon, Sun, User, Phone, LogOut, Calendar } from 'lucide-react';
import { getStoredTheme, setStoredTheme } from '../storage.ts';
import { useFirebase } from '../context/FirebaseContext.tsx';
import { getRemainingDays } from '../utils/subscription.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => getStoredTheme());
  const { userProfile, logout } = useFirebase();

  if (!isOpen) return null;

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
  };

  const remainingDays = userProfile ? getRemainingDays(userProfile.expiresAtMs) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-2xl overflow-hidden text-right p-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h2 id="settings-modal-title" className="text-base font-bold text-slate-800 dark:text-white">
            رێکخستنێن سەفرا (Settings)
          </h2>
          <button
            onClick={onClose}
            aria-label="داخستنا رێکخستنان"
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3.5">
          {/* Active Subscription Info */}
          {userProfile && (
            <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  {userProfile.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  چالاک
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span dir="ltr" className="font-mono">
                  {userProfile.phone}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#0284c7] dark:text-sky-400">
                  <Calendar className="w-3 h-3" />
                  <span>ماینە {remainingDays} ڕۆژ</span>
                </span>
              </div>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-indigo-400" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                مۆدا تاری (Dark Mode)
              </span>
            </div>
            <button
              onClick={toggleTheme}
              aria-label="گوهۆڕینا مۆدا تاری"
              role="switch"
              aria-checked={theme === 'dark'}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                theme === 'dark' ? 'bg-[#0284c7]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                  theme === 'dark' ? 'right-6 -translate-x-0.5' : 'right-0.5'
                }`}
              />
            </button>
          </div>

          {/* PWA Install Button if available */}
          <div className="flex justify-center">
            <PWAInstallButton />
          </div>

          {/* Developer Attribution */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/50 dark:from-slate-800/70 dark:to-slate-800/30 border border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              <User className="w-4 h-4 text-sky-600" />
              <span>گەشەپێدەرێ سیستەمی (Developer)</span>
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
              Omed Abdulwahid
            </div>
            <a
              href="tel:07507100238"
              className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#0284c7] hover:underline"
              dir="ltr"
            >
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>0750 710 0238</span>
            </a>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => {
              onClose();
              void logout();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>دەرکەفتن (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
