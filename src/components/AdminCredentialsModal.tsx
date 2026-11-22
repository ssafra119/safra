import React, { useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff, KeyRound, Loader2, Shield, X } from 'lucide-react';
import { updateCompanyAdminProfileAndPassword } from '../firebase.ts';

interface AdminCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  currentDisplayName: string;
  onUpdated: () => void;
}

export const AdminCredentialsModal: React.FC<AdminCredentialsModalProps> = ({
  isOpen,
  onClose,
  currentUsername,
  currentDisplayName,
  onUpdated,
}) => {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentPassword) {
      setErrorMsg('پێتڤیە پاسوۆردێ نها بنڤیسی بۆ پشتڕاستکرنێ');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('پاسوۆردێ نووی و دووپاتکرن وەک ئێک نینن!');
      return;
    }

    if (!newPassword && displayName.trim() === currentDisplayName.trim()) {
      setErrorMsg('تکایە ناڤەکێ نووی یان پاسوۆردەکێ نووی بنڤیسە');
      return;
    }

    setIsSaving(true);
    try {
      await updateCompanyAdminProfileAndPassword({
        currentPassword,
        newPassword: newPassword || undefined,
        newDisplayName:
          displayName.trim() && displayName.trim() !== currentDisplayName.trim()
            ? displayName.trim()
            : undefined,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMsg('پاسوۆردێ نها خەلەتە!');
      } else if (code === 'auth/weak-password') {
        setErrorMsg('پاسوۆردێ نووی پێتڤیە کێمترین 6 پیت یان ژمارە بن');
      } else {
        setErrorMsg('گوهۆڕین سەرنەکەفت، تکایە دوبارە هەول بدە');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-creds-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-2xl overflow-hidden text-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 text-[#0284c7] dark:text-sky-300 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="admin-creds-title"
                className="text-sm sm:text-base font-black text-slate-900 dark:text-white"
              >
                ناڤ و پاسوۆردێ ئەدمینێ کومگەهێ
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                گوهۆڕینا ناڤێ سەر شاشێ و پاسوۆردێ چوونەژوورێ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="داخستن"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {/* Read-only Login Username */}
          <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-slate-800/70 border border-sky-100 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#0284c7]" />
              ناڤێ بەکارهێنەری (Username):
            </span>
            <span dir="ltr" className="font-mono font-black text-[#0284c7] dark:text-sky-300">
              {currentUsername || 'admin'}
            </span>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Display Name */}
          <div>
            <label
              htmlFor="admin-display-name"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              ناڤێ ئەدمینی (Display Name)
            </label>
            <input
              id="admin-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="نموونە: ئەدمینێ کومگەهێ"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            />
          </div>

          {/* Current Password */}
          <div>
            <label
              htmlFor="admin-current-pass"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              پاسوۆردێ نها *
            </label>
            <div className="relative">
              <input
                id="admin-current-pass"
                type={showPasswords ? 'text' : 'password'}
                dir="ltr"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-3.5 pl-10 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-right text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((p) => !p)}
                aria-label="دیارکرن"
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="admin-new-pass"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              پاسوۆردێ نووی
            </label>
            <input
              id="admin-new-pass"
              type={showPasswords ? 'text' : 'password'}
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="ئەگەر نەتڤێت بگوهۆڕی بەتاڵ بهێلە"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-right text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            />
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              htmlFor="admin-confirm-pass"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              دووپاتکرنا پاسوۆردێ نووی
            </label>
            <input
              id="admin-confirm-pass"
              type={showPasswords ? 'text' : 'password'}
              dir="ltr"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-right text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              پاشگەزبوون
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#0284c7] hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 transition-all"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>پاراستن</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
