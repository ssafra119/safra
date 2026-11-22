import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        aria-label="دابەزاندنا بەرنامەی"
        className={`flex items-center gap-1.5 rounded-xl bg-[#0284c7] hover:bg-sky-700 text-white font-bold shadow-sm transition-all ${
          compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'
        }`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>دابەزاندنا ئەپی</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="زێدەکرن ل سەر شاشەیا سەرەکی"
          className={`flex items-center gap-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[#0284c7] dark:text-sky-300 font-bold transition-all ${
            compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>زێدەکرن ل سەر ئایفۆنی</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowIOSGuide(false);
            }}
          >
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 p-5 shadow-2xl text-right">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  زێدەکرنا سەفرا ل سەر شاشەیا موبایلێ
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <li>1. کلیک ل سەر دوگمەیا <strong>Share</strong> بکە د خوارا براوزەرێ Safari دا.</li>
                <li>2. بچۆ خوارێ و <strong>Add to Home Screen</strong> هەلبژێرە.</li>
                <li>3. کلیک ل سەر <strong>Add</strong> بکە دا وەک بەرنامە ل سەر موبایلێ بهێتە خزنکرن.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-[#0284c7] text-white text-xs font-bold"
              >
                باشە، تێگەهشتم
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
