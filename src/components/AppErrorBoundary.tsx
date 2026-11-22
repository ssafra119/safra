import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export async function clearAppCachesAndReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister().catch(() => false)));
    }
  } catch {
    // Ignore SW cleanup errors
  }

  try {
    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key).catch(() => false)));
    }
  } catch {
    // Ignore cache storage errors
  }

  window.location.reload();
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AppErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('SAFRA UI ErrorBoundary caught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#f0f7ff] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-2xl p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white mb-2">
              ئاریشەیەکا تەکنیکی د ڤەکرنا پەڕەی دا چێبوو
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              پڕانییا جاران ئەڤە ژ بەر کاشێ کەڤن یێ براوزەری یان پچڕانا ئەنتەرنێتێ یە. کلیک ل سەر دوگمەیا خوارێ بکە دا بەرنامە ب تەمامی بهێتە نویکرن.
            </p>
            <button
              type="button"
              onClick={() => void clearAppCachesAndReload()}
              className="w-full py-3 px-4 rounded-2xl bg-[#0284c7] hover:bg-sky-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>نویکرن و پاکژکرنا کاشێ بەرنامەی</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
