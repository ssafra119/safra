import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowRight,
  CalendarPlus,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Moon,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  bootstrapSuperAdminProfile,
  createCompanyAdminInFirebase,
  createRepAccountInFirebase,
  deleteUserAccountDoc,
  handleFirestoreError,
  loginSuperAdminGoogle,
  logoutSuperAdmin,
  OperationType,
  parseFirestoreUserDoc,
  renewUserPlan,
  resetUserDeviceLock,
  superAuth,
  superDb,
  toggleUserActive,
} from './firebase.ts';
import { getStoredTheme, setStoredTheme } from './storage.ts';
import type { UserAccount, UserRole } from './types.ts';
import { normalizeEnglishDigits } from './utils/stock.ts';
import {
  buildRepWhatsAppMessage,
  filterUserAccounts,
  generateSixDigitPin,
  getAccountStatus,
  getRemainingDays,
  isSubscriptionActive,
  normalizeAdminUsername,
  normalizePhone,
  validateCompanyAdminCredentials,
} from './utils/subscription.ts';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';

interface CreatedSummary {
  kind: 'rep' | 'admin';
  name: string;
  identifierLabel: string;
  identifierValue: string;
  secretLabel: string;
  secretValue: string;
  durationLabel: string;
  shareText: string;
}

function formatDateEn(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function roleLabelKu(role: UserRole): string {
  if (role === 'superadmin') return 'سەرپەرشتیارێ گشتی';
  if (role === 'admin') return 'ئەدمینێ کومگەهێ';
  return 'نوینەر';
}

function SuperAdminLoginScreen({
  theme,
  toggleTheme,
  authError,
  onLoginGoogle,
}: {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  authError: string | null;
  onLoginGoogle: () => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleClick = async () => {
    setLocalError('');
    setIsSubmitting(true);
    try {
      await onLoginGoogle();
    } catch {
      setLocalError('چوونەژوور ب Google سەرنەکەفت، تکایە د تەبەکێ نووی دا دوبارە هەول بدە');
    } finally {
      setIsSubmitting(false);
    }
  };

  const err = localError || authError;

  return (
    <div className="min-h-screen bg-[#f0f7ff] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-sky-400/20 dark:bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-400/20 dark:bg-indigo-500/10 blur-3xl" />

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
          onClick={toggleTheme}
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

      <div className="w-full max-w-md rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-sky-100 dark:border-slate-800 shadow-2xl shadow-sky-900/10 p-6 sm:p-8 z-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0284c7] to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/30 mx-auto mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-1">
          پەنێلا سەرپەرشتیارێ گشتی (Super Admin)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed">
          بتنێ بۆ خاوەنێ سیستەمی — ڕێڤەبرنا حسابێن نوینەران، بەشداریان و ئەدمینێ کومگەهێ
        </p>

        {err && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-bold flex items-start gap-2 text-right"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleClick()}
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#0284c7] hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-bold shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transition-all"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          <span>{isSubmitting ? 'چوونەژوور دهێتە کرن...' : 'چوونەژوور ب Google (Super Admin)'}</span>
        </button>
      </div>
    </div>
  );
}

function SuperAdminAccessDenied({
  message,
  profile,
  onLogout,
}: {
  message: string;
  profile: UserAccount | null;
  onLogout: () => Promise<void>;
}) {
  return (
    <div className="min-h-screen bg-[#f0f7ff] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-red-200 dark:border-red-900/60 shadow-2xl p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-relaxed mb-2">
          {message}
        </h1>
        {profile && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            حساب: <span className="font-bold">{profile.name}</span> ({profile.phone})
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <a
            href="/index.html"
            className="flex-1 py-2.5 px-4 rounded-2xl bg-[#0284c7] hover:bg-sky-700 text-white text-xs sm:text-sm font-bold text-center transition-all"
          >
            ڤەگەریان بۆ کەتەلۆگی
          </a>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>دەرکەفتن</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountsDashboard({
  user,
  userProfile,
  theme,
  toggleTheme,
  onLogout,
}: {
  user: User;
  userProfile: UserAccount;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onLogout: () => Promise<void>;
}) {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'expired'>('all');

  // Creation mode tabs: 'rep' (Sales Rep Phone+PIN) vs 'admin' (Company Warehouse Admin Username+Password)
  const [createTab, setCreateTab] = useState<'rep' | 'admin'>('rep');

  // Sales Rep Form state
  const [repName, setRepName] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [repNotes, setRepNotes] = useState('');
  const [repDays, setRepDays] = useState('30');
  const [repPin, setRepPin] = useState(() => generateSixDigitPin());

  // Company Admin (/admin) Form state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminDisplayName, setAdminDisplayName] = useState('ئەدمینێ کومگەهێ');
  const [adminPassword, setAdminPassword] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Created Share Card
  const [createdSummary, setCreatedSummary] = useState<CreatedSummary | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Per-account custom renew days & busy tracking
  const [customRenewDays, setCustomRenewDays] = useState<Record<string, string>>({});
  const [busyUid, setBusyUid] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3200);
  };

  // Real-time Firestore listener on superDb users collection
  useEffect(() => {
    const usersCol = collection(superDb, 'users');
    const unsub = onSnapshot(
      usersCol,
      (snapshot) => {
        const list: UserAccount[] = [];
        snapshot.forEach((docSnap) => {
          list.push(parseFirestoreUserDoc(docSnap.id, docSnap.data() as Record<string, unknown>));
        });
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setAccounts(list);
        setAccountsLoading(false);
      },
      (error) => {
        setAccountsLoading(false);
        try {
          handleFirestoreError(error, OperationType.LIST, 'users', superAuth);
        } catch {
          showToast('خاندنا لیستا حسابان سەرنەکەفت', 'error');
        }
      }
    );

    return () => unsub();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    let active = 0;
    let blocked = 0;
    let expired = 0;
    for (const acc of accounts) {
      const st = getAccountStatus(acc, now);
      if (st === 'active') active++;
      else if (st === 'blocked') blocked++;
      else expired++;
    }
    return { total: accounts.length, active, blocked, expired };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return filterUserAccounts(accounts, searchQuery, statusFilter);
  }, [accounts, searchQuery, statusFilter]);

  const handleCopyShare = async (text: string, id = 'created') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast('هاتە کۆپیکرن ✅');
      window.setTimeout(() => setCopiedId(null), 2200);
    } catch {
      showToast('کۆپیکرن سەرنەکەفت، ب دەستی کۆپی بکە', 'error');
    }
  };

  const handleCreateRep = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = repName.trim();
    const cleanPhone = normalizePhone(repPhone);
    const cleanPin = normalizeEnglishDigits(repPin).replace(/[^0-9]/g, '');
    const parsedDays = Math.max(1, parseInt(normalizeEnglishDigits(repDays) || '30', 10) || 30);

    if (!cleanName) {
      setFormError('هیڤیدارین ناڤێ نوینەری بنڤیسە');
      return;
    }
    if (cleanPhone.length < 7) {
      setFormError('هیڤیدارین ژمارەیا موبایلێ ب دروستی بنڤیسە');
      return;
    }
    if (cleanPin.length < 6) {
      setFormError('کۆدێ نهێنی (PIN) پێتڤیە 6 ژمارە بیت');
      return;
    }

    setIsCreating(true);
    try {
      await createRepAccountInFirebase({
        name: cleanName,
        phone: cleanPhone,
        notes: repNotes.trim(),
        pin: cleanPin,
        durationDays: parsedDays,
        role: 'rep',
      });

      const appUrl = window.location.origin;
      const shareText = buildRepWhatsAppMessage({
        appUrl,
        name: cleanName,
        phone: cleanPhone,
        pin: cleanPin,
        durationDays: parsedDays,
      });

      setCreatedSummary({
        kind: 'rep',
        name: cleanName,
        identifierLabel: 'ژمارەیا موبایلێ:',
        identifierValue: cleanPhone,
        secretLabel: 'کۆدێ نهێنی (PIN):',
        secretValue: cleanPin,
        durationLabel: `${parsedDays} ڕۆژ`,
        shareText,
      });

      setRepName('');
      setRepPhone('');
      setRepNotes('');
      setRepDays('30');
      setRepPin(generateSixDigitPin());
      showToast('حسابێ نوینەری ب سەرکەفتیانە هاتە دروستکرن 🎉');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      const msg = (err as { message?: string })?.message || '';
      if (code === 'auth/email-already-in-use') {
        setFormError('ئەڤ ژمارەیا موبایلێ بەرێ د سیستەمیدا هاتیە تۆمارکرن!');
      } else if (code === 'auth/operation-not-allowed') {
        setFormError('پێتڤیە Email/Password د Firebase Console دا بهێتە چالاککرن');
      } else {
        setFormError(msg || 'دروستکرنا حسابی سەرنەکەفت، دوبارە هەول بدە');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateCompanyAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const validation = validateCompanyAdminCredentials(adminUsername, adminPassword);
    if (!validation.valid) {
      setFormError(validation.error || 'ناڤێ بەکارهێنەری یان پاسوۆرد نادروستە');
      return;
    }

    setIsCreating(true);
    try {
      const { cleanUsername } = await createCompanyAdminInFirebase({
        username: validation.cleanUsername,
        displayName: adminDisplayName.trim() || 'ئەدمینێ کومگەهێ',
        password: adminPassword,
      });

      const adminUrl = `${window.location.origin}/admin`;
      const shareText = [
        `زانیاریێن پەنێلا کومگەها سەفرا (SAFRA Admin):`,
        `لینکێ کۆنتڕۆلا کومگەهێ: ${adminUrl}`,
        `ناڤێ بەکارهێنەری (Username): ${cleanUsername}`,
        `پاسوۆرد (Password): ${adminPassword}`,
        `تێبینی: ژ ناڤ پەنێلێ دا دشێی پاسوۆردێ خۆ بگوهۆڕی.`,
      ].join('\n');

      setCreatedSummary({
        kind: 'admin',
        name: adminDisplayName.trim() || 'ئەدمینێ کومگەهێ',
        identifierLabel: 'ناڤێ بەکارهێنەری (Username):',
        identifierValue: cleanUsername,
        secretLabel: 'پاسوۆرد (Password):',
        secretValue: adminPassword,
        durationLabel: 'کۆنتڕۆلا کومگەهێ (/admin)',
        shareText,
      });

      setAdminUsername('');
      setAdminPassword('');
      setAdminDisplayName('ئەدمینێ کومگەهێ');
      showToast('حسابێ ئەدمینێ کومگەهێ (/admin) هاتە دروستکرن 🛡️');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      const msg = (err as { message?: string })?.message || '';
      if (code === 'auth/email-already-in-use') {
        setFormError('ئەڤ ناڤێ بەکارهێنەری بەرێ هەیە! ناڤەکێ دی هەلبژێرە');
      } else if (code === 'auth/operation-not-allowed') {
        setFormError('پێتڤیە Email/Password د Firebase Console دا بهێتە چالاککرن');
      } else {
        setFormError(msg || 'دروستکرنا حسابێ ئەدمینی سەرنەکەفت');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (acc: UserAccount) => {
    if (acc.uid === user.uid) {
      showToast('تو نەشێی حسابێ خۆ ڕابگری', 'error');
      return;
    }
    setBusyUid(acc.uid);
    try {
      await toggleUserActive(acc.uid, !acc.active);
      showToast(!acc.active ? 'حساب هاتە ڤەکرن 🟢' : 'حساب هاتە ڕاگرتن 🔴');
    } catch {
      showToast('گوهۆڕینا بارودۆخێ حسابی سەرنەکەفت', 'error');
    } finally {
      setBusyUid(null);
    }
  };

  const handleRenew = async (acc: UserAccount, days: number) => {
    const safeDays = Math.max(1, Math.floor(days));
    setBusyUid(acc.uid);
    try {
      await renewUserPlan(acc.uid, acc.expiresAtMs, safeDays);
      showToast(`بەشداری بۆ ${acc.name} ب +${safeDays} ڕۆژ هاتە نویکرن`);
    } catch {
      showToast('نویکرنا بەشداریێ سەرنەکەفت', 'error');
    } finally {
      setBusyUid(null);
    }
  };

  const handleResetDevice = async (acc: UserAccount) => {
    if (!window.confirm(`ئەرێ تو دپشتڕاستی سفرکرنا گرێدانا موبایلێ بۆ "${acc.name}"؟`)) return;
    setBusyUid(acc.uid);
    try {
      await resetUserDeviceLock(acc.uid);
      showToast(`گرێدانا موبایلێ بۆ ${acc.name} هاتە سفرکرن 🔓`);
    } catch {
      showToast('سفرکرنا موبایلێ سەرنەکەفت', 'error');
    } finally {
      setBusyUid(null);
    }
  };

  const handleDeleteAccount = async (acc: UserAccount) => {
    if (acc.uid === user.uid) {
      showToast('تو نەشێی حسابێ خۆ ژێ ببەی', 'error');
      return;
    }
    if (!window.confirm(`ئەرێ تو دپشتڕاستی ژێبرنا حسابێ "${acc.name}" (${acc.phone})؟`)) return;
    setBusyUid(acc.uid);
    try {
      await deleteUserAccountDoc(acc.uid);
      showToast('حساب ژ فایەربەیس هاتە ژێبرن');
    } catch {
      showToast('ژێبرنا حسابی سەرنەکەفت', 'error');
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f7ff] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-[#0284c7] selection:text-white pb-16">
      {toast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 flex justify-center pointer-events-none">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 border ${
              toast.type === 'error'
                ? 'bg-red-600 text-white border-red-400/40'
                : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-white/10'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-sky-400 dark:text-sky-600" />
            )}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Super Admin Header */}
      <header className="sticky top-0 z-30 glass-header shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0284c7] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/30">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>حسابێن نوینەران و بەشداری</span>
                  <span className="text-xs font-mono font-bold text-[#0284c7] dark:text-sky-400">
                    SAFRA Super Admin
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {userProfile.name} • پەنێلا تایبەت یا خاوەنێ سیستەمی
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
              <PWAInstallButton compact />

              <a
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#0284c7]" />
                <span>کۆنتڕۆلا کومگەهێ</span>
              </a>

              <button
                onClick={toggleTheme}
                aria-label="گوهۆڕینا مۆدێ"
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
              >
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
              </button>

              <button
                onClick={() => void onLogout()}
                aria-label="دەرکەفتن"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-bold transition-all shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">دەرکەفتن</span>
              </button>

              <a
                href="/index.html"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>کەتەلۆگ</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 pt-4 space-y-5 flex-1">
        {/* Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              کۆی حسابان
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {stats.total}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              🟢 چالاک
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.active}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-red-100 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
              🔴 ڕاگرتی
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-red-600 dark:text-red-400 mt-0.5">
              {stats.blocked}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              ⏳ خلاس بوویە
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {stats.expired}
            </p>
          </div>
        </div>

        {/* Account Creation Section (Sales Rep vs Company Admin) + Copy Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <section className="lg:col-span-7 p-4 sm:p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-sky-100 dark:border-slate-800 shadow-sm">
            {/* Switch Tabs */}
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 mb-4">
              <button
                type="button"
                onClick={() => {
                  setCreateTab('rep');
                  setFormError('');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  createTab === 'rep'
                    ? 'bg-white dark:bg-slate-900 text-[#0284c7] dark:text-sky-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>حسابێ نوینەری (کەتەلۆگ)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateTab('admin');
                  setFormError('');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  createTab === 'admin'
                    ? 'bg-white dark:bg-slate-900 text-[#0284c7] dark:text-sky-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>ئەدمینێ کومگەهێ (/admin)</span>
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {createTab === 'rep' ? (
              <form onSubmit={handleCreateRep} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="rep-name-input"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      ناڤێ نوینەری *
                    </label>
                    <input
                      id="rep-name-input"
                      type="text"
                      required
                      value={repName}
                      onChange={(e) => setRepName(e.target.value)}
                      placeholder="نموونە: ئەحمەد عەلی"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="rep-phone-input"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      ژمارەیا موبایلێ *
                    </label>
                    <input
                      id="rep-phone-input"
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      required
                      value={repPhone}
                      onChange={(e) => setRepPhone(normalizeEnglishDigits(e.target.value))}
                      placeholder="0750 123 4567"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-right text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="rep-pin-input"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      کۆدێ 6 ژمارەیی (PIN) *
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        id="rep-pin-input"
                        type="text"
                        inputMode="numeric"
                        dir="ltr"
                        maxLength={6}
                        required
                        value={repPin}
                        onChange={(e) =>
                          setRepPin(
                            normalizeEnglishDigits(e.target.value)
                              .replace(/[^0-9]/g, '')
                              .slice(0, 6)
                          )
                        }
                        className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono font-bold text-center tracking-widest text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                      />
                      <button
                        type="button"
                        onClick={() => setRepPin(generateSixDigitPin())}
                        title="دروستکرنا کۆدەکێ نووی"
                        aria-label="دروستکرنا کۆدەکێ نووی"
                        className="px-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[#0284c7] dark:text-sky-300 hover:bg-sky-100 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="rep-days-input"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      ماوێ بەشداریێ (ڕۆژ)
                    </label>
                    <input
                      id="rep-days-input"
                      type="number"
                      min={1}
                      max={3650}
                      dir="ltr"
                      required
                      value={repDays}
                      onChange={(e) => setRepDays(normalizeEnglishDigits(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono font-bold text-center text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label
                      htmlFor="rep-notes-input"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      باژێر یان تێبینی
                    </label>
                    <input
                      id="rep-notes-input"
                      type="text"
                      value={repNotes}
                      onChange={(e) => setRepNotes(e.target.value)}
                      placeholder="نموونە: دهۆک - زاخۆ"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[30, 90, 180, 365].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRepDays(String(preset))}
                        className={`px-2.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                          repDays === String(preset)
                            ? 'bg-[#0284c7] text-white border-[#0284c7]'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {preset} ڕۆژ
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-3 px-4 rounded-2xl bg-[#0284c7] hover:bg-sky-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transition-all"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{isCreating ? 'حساب دهێتە دروستکرن...' : 'دروستکرنا حسابێ نوینەری'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleCreateCompanyAdmin} className="space-y-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  حسابێ ئەدمینێ کومگەهێ بتنێ بۆ پەڕێ <span className="font-mono font-bold">/admin</span> کار دکەت (زێدەکرن و ژێبرنا بەرهەمان) و چ دەستهەڵات نینە ل سەر پەڕێ <span className="font-mono font-bold">/accounts</span>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="company-admin-username"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      ناڤێ بەکارهێنەری (Username) *
                    </label>
                    <input
                      id="company-admin-username"
                      type="text"
                      dir="ltr"
                      required
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(normalizeAdminUsername(e.target.value))}
                      placeholder="safra"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-right text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="company-admin-name"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      ناڤێ ئەدمینی (Display Name)
                    </label>
                    <input
                      id="company-admin-name"
                      type="text"
                      value={adminDisplayName}
                      onChange={(e) => setAdminDisplayName(e.target.value)}
                      placeholder="ئەدمینێ کومگەهێ"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="company-admin-password"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    پاسوۆرد (Password - کێمترین 6 پیت یان ژمارە) *
                  </label>
                  <input
                    id="company-admin-password"
                    type="text"
                    dir="ltr"
                    required
                    minLength={6}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="نموونە: safra2025"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-right text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-3 px-4 rounded-2xl bg-[#0284c7] hover:bg-sky-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transition-all"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>{isCreating ? 'حساب دهێتە دروستکرن...' : 'دروستکرنا ئەدمینێ کومگەهێ (/admin)'}</span>
                </button>
              </form>
            )}
          </section>

          {/* 1-Click Share Card */}
          <section className="lg:col-span-5 p-4 sm:p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-sky-100 dark:border-slate-800 shadow-sm">
            {createdSummary ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حساب ب سەرکەفتیانە هاتە چێکرن!</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCreatedSummary(null)}
                    aria-label="داخستن"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ناڤ:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {createdSummary.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{createdSummary.identifierLabel}</span>
                    <span dir="ltr" className="font-mono font-bold text-[#0284c7] dark:text-sky-400">
                      {createdSummary.identifierValue}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{createdSummary.secretLabel}</span>
                    <span dir="ltr" className="font-mono font-black text-slate-900 dark:text-white">
                      {createdSummary.secretValue}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">بەش / ماوە:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {createdSummary.durationLabel}
                    </span>
                  </div>
                </div>

                <pre
                  dir="rtl"
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans"
                >
                  {createdSummary.shareText}
                </pre>

                <button
                  type="button"
                  onClick={() => void handleCopyShare(createdSummary.shareText, 'created')}
                  className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                >
                  {copiedId === 'created' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>هاتە کۆپیکرن ✅</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>📋 کۆپیکرن بۆ واتسئەپێ</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-slate-800 text-[#0284c7] dark:text-sky-400 flex items-center justify-center mx-auto">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  کارتێ زانیاریێن واتسئەپێ
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                  پشتی دروستکرنا حسابێ نوینەری یان ئەدمینێ کومگەهێ (/admin)، زانیاریێن چوونەژوورێ ل ڤێرە دێ دیار بن دا ب ئێک کلیک کۆپی بکەی.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Accounts List */}
        <section className="space-y-3">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ل ناڤ نوینەران، ژمارەیا موبایلێ یان ئەدمینان بگەرە..."
                className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="پاکژکرن"
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { key: 'all', label: 'هەمی', count: stats.total },
                { key: 'active', label: '🟢 چالاک', count: stats.active },
                { key: 'blocked', label: '🔴 ڕاگرتی', count: stats.blocked },
                { key: 'expired', label: '⏳ خلاس بوویە', count: stats.expired },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() =>
                    setStatusFilter(tab.key as 'all' | 'active' | 'blocked' | 'expired')
                  }
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    statusFilter === tab.key
                      ? 'bg-[#0284c7] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="font-mono text-[10px] opacity-85">({tab.count})</span>
                </button>
              ))}
            </div>
          </div>

          {accountsLoading ? (
            <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-8 h-8 text-[#0284c7] mx-auto mb-2 animate-spin" />
              <p className="text-xs font-bold text-slate-500">حساب دهێنە بارکرن...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                چ حساب نەهاتنە دیتن
              </h3>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAccounts.map((acc) => {
                const status = getAccountStatus(acc);
                const remainingDays = getRemainingDays(acc.expiresAtMs);
                const isSelf = acc.uid === user.uid;
                const isBusy = busyUid === acc.uid;
                const customDays = customRenewDays[acc.uid] ?? '30';

                return (
                  <div
                    key={acc.uid}
                    className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      status === 'blocked'
                        ? 'border-red-200 dark:border-red-900/60 bg-red-50/10'
                        : status === 'expired'
                          ? 'border-amber-200 dark:border-amber-900/60'
                          : 'border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {acc.name || 'بێ ناڤ'}
                        </h3>

                        {status === 'active' && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                            🟢 چالاک
                          </span>
                        )}
                        {status === 'blocked' && (
                          <span className="px-2 py-0.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 text-[11px] font-bold">
                            🔴 ڕاگرتی
                          </span>
                        )}
                        {status === 'expired' && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold">
                            ⏳ خلاس بوویە
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-bold">
                          {roleLabelKu(acc.role)}
                        </span>

                        {isSelf && (
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold">
                            حسابێ تە
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 font-mono" dir="ltr">
                          <Phone className="w-3.5 h-3.5 text-[#0284c7]" />
                          {acc.phone || '—'}
                        </span>

                        {acc.notes && <span>📍 {acc.notes}</span>}

                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {remainingDays > 0 ? (
                            <>
                              ماینە <span className="font-mono text-[#0284c7]">{remainingDays}</span> ڕۆژ
                            </>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">بەشداری خلاس بوویە</span>
                          )}{' '}
                          <span className="font-mono text-[11px] text-slate-400" dir="ltr">
                            ({formatDateEn(acc.expiresAtMs)})
                          </span>
                        </span>
                      </div>

                      {acc.role === 'rep' && (
                        <div className="pt-0.5">
                          {acc.deviceId ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                              <Smartphone className="w-3.5 h-3.5 text-[#0284c7]" />
                              <span>📱 گرێدایە ب موبایلێ ڤە</span>
                              <span className="font-mono text-[10px] text-slate-400" dir="ltr">
                                ({acc.deviceId.slice(0, 8)})
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                              <Unlock className="w-3.5 h-3.5" />
                              <span>🔓 نەهاتیە گرێدان</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        disabled={isBusy || isSelf}
                        onClick={() => void handleToggleActive(acc)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all disabled:opacity-45 ${
                          acc.active
                            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-100'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        {acc.active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{acc.active ? 'گرتن (ڕاگرتن)' : 'ڤەکرن'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleRenew(acc, 30)}
                        className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-[#0284c7] dark:text-sky-300 hover:bg-sky-100 text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-45"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span className="font-mono">+30</span>
                        <span>ڕۆژ</span>
                      </button>

                      <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
                        <input
                          type="number"
                          min={1}
                          max={3650}
                          dir="ltr"
                          aria-label={`ژمارەیا ڕۆژێن نویکرنێ بۆ ${acc.name}`}
                          value={customDays}
                          onChange={(e) =>
                            setCustomRenewDays((prev) => ({
                              ...prev,
                              [acc.uid]: normalizeEnglishDigits(e.target.value),
                            }))
                          }
                          className="w-12 px-1.5 py-1 text-center text-xs font-mono font-bold bg-transparent text-slate-800 dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleRenew(acc, parseInt(customDays || '30', 10) || 30)}
                          className="px-2 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-[11px] font-bold text-slate-700 dark:text-slate-100 transition-colors"
                        >
                          نویکرن
                        </button>
                      </div>

                      {acc.role === 'rep' && (
                        <button
                          type="button"
                          disabled={isBusy || !acc.deviceId}
                          onClick={() => void handleResetDevice(acc)}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-40"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>سفرکرنا موبایلێ</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isBusy || isSelf}
                        onClick={() => void handleDeleteAccount(acc)}
                        aria-label={`ژێبرنا ${acc.name}`}
                        className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function AccountsRoot() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getStoredTheme());
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileResolved, setProfileResolved] = useState(false);
  const [userProfile, setUserProfile] = useState<UserAccount | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(superAuth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        setProfileResolved(true);
      } else {
        setProfileResolved(false);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    let bootstrapped = false;

    const userDocRef = doc(superDb, 'users', user.uid);
    const unsub = onSnapshot(
      userDocRef,
      async (snap) => {
        if (!snap.exists()) {
          if (
            user.email === 'omedrekani128@gmail.com' &&
            user.emailVerified &&
            !bootstrapped
          ) {
            bootstrapped = true;
            try {
              await bootstrapSuperAdminProfile(user, superDb, superAuth);
            } catch {
              setProfileResolved(true);
            }
            return;
          }
          setUserProfile(null);
          setProfileResolved(true);
          return;
        }

        const parsed = parseFirestoreUserDoc(snap.id, snap.data() as Record<string, unknown>);
        setUserProfile(parsed);
        setProfileResolved(true);
      },
      () => {
        setAuthError('پشکنینا مۆلەتا سەرپەرشتیاری سەرنەکەفت.');
        setProfileResolved(true);
      }
    );

    return () => unsub();
  }, [authReady, user]);

  if (!authReady || (user && !profileResolved)) {
    return (
      <div className="min-h-screen bg-[#f0f7ff] dark:bg-slate-950 flex flex-col items-center justify-center p-4 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#0284c7] flex items-center justify-center text-white shadow-lg shadow-sky-600/30">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
          داتا دهێنە پشکنین...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <SuperAdminLoginScreen
        theme={theme}
        toggleTheme={toggleTheme}
        authError={authError}
        onLoginGoogle={async () => {
          setAuthError(null);
          await loginSuperAdminGoogle();
        }}
      />
    );
  }

  if (!userProfile || !isSubscriptionActive(userProfile) || userProfile.role !== 'superadmin') {
    return (
      <SuperAdminAccessDenied
        message="⚠️ ئەڤ پەنێلە بتنێ بۆ سەرپەرشتیارێ گشتی (Super Admin) هاتیە تەرخانکرن."
        profile={userProfile}
        onLogout={logoutSuperAdmin}
      />
    );
  }

  return (
    <AccountsDashboard
      user={user}
      userProfile={userProfile}
      theme={theme}
      toggleTheme={toggleTheme}
      onLogout={logoutSuperAdmin}
    />
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<AccountsRoot />);
}
