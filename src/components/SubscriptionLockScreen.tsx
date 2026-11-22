import React from 'react';
import { AlertTriangle, LogOut, Phone, ShieldAlert } from 'lucide-react';
import { SUBSCRIPTION_BLOCKED_MESSAGE, useFirebase } from '../context/FirebaseContext.tsx';
import { resolveAppRoute } from '../utils/routes.ts';

interface SubscriptionLockScreenProps {
  message?: string;
  showBackToCatalog?: boolean;
}

export const SubscriptionLockScreen: React.FC<SubscriptionLockScreenProps> = ({
  message = SUBSCRIPTION_BLOCKED_MESSAGE,
  showBackToCatalog = false,
}) => {
  const { logout, userProfile } = useFirebase();

  return (
    <div className="min-h-screen bg-[#f0f7ff] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-red-200 dark:border-red-900/60 shadow-2xl p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
          {showBackToCatalog ? (
            <ShieldAlert className="w-8 h-8" />
          ) : (
            <AlertTriangle className="w-8 h-8" />
          )}
        </div>

        <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-relaxed mb-2">
          {message}
        </h1>

        {userProfile && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4">
            حساب: <span className="font-bold">{userProfile.name}</span> ({userProfile.phone})
          </p>
        )}

        <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-slate-800/70 border border-sky-100 dark:border-slate-700 mb-5">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
            پەیوەندی ب رێڤەبەرێ سەفرا (SAFRA):
          </p>
          <a
            href="tel:07507100238"
            dir="ltr"
            className="inline-flex items-center gap-2 text-sm font-mono font-bold text-[#0284c7] dark:text-sky-400 hover:underline"
          >
            <Phone className="w-4 h-4" />
            <span>0750 710 0238</span>
          </a>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          {showBackToCatalog && (
            <a
              href={resolveAppRoute('catalog')}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-[#0284c7] hover:bg-sky-700 text-white text-xs sm:text-sm font-bold text-center transition-all"
            >
              ڤەگەریان بۆ کەتەلۆگی
            </a>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>دەرکەفتن (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
