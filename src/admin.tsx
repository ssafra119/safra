import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import {
  ShieldCheck,
  ArrowRight,
  Plus,
  FolderTree,
  Download,
  Upload,
  RefreshCw,
  Search,
  X,
  Edit2,
  Trash2,
  Package,
  Moon,
  Sun,
  Minus,
  CloudUpload,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import type { Category, Product } from './types.ts';
import {
  saveCategoriesAndProducts,
  downloadBackupFile,
  importBackupData,
  resetToSeedData,
  getStoredTheme,
  setStoredTheme,
  getInitialCategories,
  getInitialProducts,
} from './storage.ts';
import { filterProducts, formatPriceNumber, formatStockStatus } from './utils/stock.ts';
import { AdminCategoryModal } from './components/AdminCategoryModal.tsx';
import { AdminProductModal } from './components/AdminProductModal.tsx';
import { AdminLoginScreen } from './components/AdminLoginScreen.tsx';
import { AdminCredentialsModal } from './components/AdminCredentialsModal.tsx';
import { PullToRefresh } from './components/PullToRefresh.tsx';
import { SubscriptionLockScreen } from './components/SubscriptionLockScreen.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';
import { FirebaseProvider, useFirebase } from './context/FirebaseContext.tsx';
import {
  syncProductToFirestore,
  deleteProductFromFirestore,
  syncCategoryToFirestore,
  deleteCategoryFromFirestore,
} from './firebase.ts';

interface AdminAppProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

function AdminDashboard({ theme, toggleTheme }: AdminAppProps) {
  const {
    user,
    userProfile,
    products,
    categories,
    catalogLoading,
    logout,
    syncWithCloud,
  } = useFirebase();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStock, setFilterStock] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Sync / toast state
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3200);
  };

  const currentAdminUsername = useMemo(() => {
    if (user?.email?.endsWith('@admin.safra.app')) {
      return user.email.replace('@admin.safra.app', '');
    }
    return userProfile?.phone || 'admin';
  }, [user, userProfile]);

  const handleCloudSync = async () => {
    setIsSyncing(true);
    try {
      await syncWithCloud();
      showToast('داتا دگەل فایەربەیس (Firestore) هاتنە هەڤدەمکرن ☁️');
    } catch {
      showToast('هەڤدەمکرن سەرنەکەفت، دوبارە هەول بدە', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefresh = async () => {
    await new Promise((r) => setTimeout(r, 450));
    showToast('داتا هاتنە نویکردن');
  };

  // Product Save (Add or Edit) -> Live Firestore + Local Cache
  const handleSaveProduct = async (product: Product) => {
    const exists = products.some((p) => p.id === product.id);
    try {
      await syncProductToFirestore(product);
      const updated = exists
        ? products.map((p) => (p.id === product.id ? product : p))
        : [product, ...products];
      saveCategoriesAndProducts(categories, updated);
      showToast(exists ? 'بەرهەم ب سەرکەفتیانە هاتە گوهۆڕین' : 'بەرهەمێ نووی هاتە زێدەکرن');
    } catch {
      showToast('پاراستنا بەرهەمی ل سەر فایەربەیس سەرنەکەفت', 'error');
    }
  };

  // Product Delete -> Live Firestore
  const handleDeleteProduct = async (productId: string, title: string) => {
    if (!window.confirm(`ئەرێ دپشتڕاستی ژێبرنا بەرهەمێ "${title}"؟`)) return;
    try {
      await deleteProductFromFirestore(productId);
      const updated = products.filter((p) => p.id !== productId);
      saveCategoriesAndProducts(categories, updated);
      showToast('بەرهەم هاتە ژێبرن');
    } catch {
      showToast('ژێبرنا بەرهەمی سەرنەکەفت', 'error');
    }
  };

  // Quick adjust stock -> Live Firestore
  const handleAdjustStock = async (
    productId: string,
    field: 'stockCartons' | 'stockPieces',
    delta: number
  ) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const currentVal = target[field] || 0;
    const newVal = Math.max(0, currentVal + delta);
    const updatedProduct: Product = {
      ...target,
      [field]: newVal,
      updatedAt: new Date().toISOString(),
    };

    try {
      await syncProductToFirestore(updatedProduct);
    } catch {
      showToast('نویکرنا کۆگەهێ سەرنەکەفت', 'error');
    }
  };

  // Categories & Products synchronized save -> Live Firestore + Local Cache
  const handleSaveCategoriesAndProducts = async (
    newCategories: Category[],
    newProducts: Product[]
  ) => {
    try {
      const removedCategories = categories.filter(
        (oldCat) => !newCategories.some((newCat) => newCat.id === oldCat.id)
      );

      for (const removed of removedCategories) {
        await deleteCategoryFromFirestore(removed.id);
      }

      for (let i = 0; i < newCategories.length; i++) {
        await syncCategoryToFirestore(newCategories[i], i + 1);
      }

      for (const p of newProducts) {
        const prev = products.find((oldP) => oldP.id === p.id);
        if (!prev || prev.category !== p.category) {
          await syncProductToFirestore(p);
        }
      }

      saveCategoriesAndProducts(newCategories, newProducts);
      showToast('گوهۆڕینێن بەشان هاتنە پاراستن');
    } catch {
      showToast('پاراستنا بەشان ل سەر فایەربەیس سەرنەکەفت', 'error');
    }
  };

  // Backup Export
  const handleExportBackup = () => {
    saveCategoriesAndProducts(categories, products);
    downloadBackupFile();
    showToast('فایلێ پاشەکەوتێ هاتە داونلۆدکرن (safra_backup.json)');
  };

  // Backup Import -> Local + Firestore
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = importBackupData(content);
      if (res.success) {
        setIsSyncing(true);
        try {
          const importedCats = getInitialCategories();
          const importedProds = getInitialProducts();
          for (let i = 0; i < importedCats.length; i++) {
            await syncCategoryToFirestore(importedCats[i], i + 1);
          }
          for (const p of importedProds) {
            await syncProductToFirestore(p);
          }
          showToast(`پاشەکەوت هاتە ڤەگەراندن (${res.count} بەرهەم)`);
        } catch {
          showToast('پاشەکەوت ب شێوەیەکێ تەمام نەهاتە هەڤدەمکرن', 'error');
        } finally {
          setIsSyncing(false);
        }
      } else {
        showToast(res.error || 'خەلەتەک د فایلیدا هەیە', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Seed / Reset to Initial Data -> Firestore
  const handleSeedCloudData = async (skipConfirm = false) => {
    if (
      !skipConfirm &&
      !window.confirm('ئەرێ تو دپشتڕاستی داتایێن دەستپێکێ بۆ فایەربەیس بهێنە بارکرن؟')
    ) {
      return;
    }
    setIsSyncing(true);
    try {
      resetToSeedData();
      const seedCats = getInitialCategories();
      const seedProds = getInitialProducts();
      for (let i = 0; i < seedCats.length; i++) {
        await syncCategoryToFirestore(seedCats[i], i + 1);
      }
      for (const p of seedProds) {
        await syncProductToFirestore(p);
      }
      showToast('داتایێن دەستپێکی بۆ کڵاودێ هاتنە بارکرن ☁️');
    } catch {
      showToast('بارکرنا داتایێن دەستپێکی سەرنەکەفت', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    let result = filterProducts(products, searchQuery, selectedCategory);

    if (filterStock === 'in_stock') {
      result = result.filter((p) => p.stockCartons > 0 || p.stockPieces > 0);
    } else if (filterStock === 'out_of_stock') {
      result = result.filter((p) => p.stockCartons === 0 && p.stockPieces === 0);
    }

    return result;
  }, [products, searchQuery, selectedCategory, filterStock]);

  // Statistics
  const totalCartons = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stockCartons || 0), 0);
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter((p) => p.stockCartons === 0 && p.stockPieces === 0).length;
  }, [products]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-[#f0f7ff] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-[#0284c7] selection:text-white pb-16">
        {/* Toast Notification */}
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

        {/* Top Header — Completely isolated from /accounts */}
        <header className="sticky top-0 z-30 glass-header shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Brand & Title */}
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0284c7] to-blue-700 flex items-center justify-center text-white shadow-md shadow-sky-600/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>کۆنتڕۆلا کومگەهێ</span>
                    <span className="text-xs font-mono font-bold text-[#0284c7] dark:text-sky-400">
                      SAFRA Admin
                    </span>
                  </h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {userProfile?.name ? `${userProfile.name} • ` : ''}
                    رێکخستنا بەرهەم، سعر و کۆگەهێ (شەریکە)
                  </p>
                </div>
              </div>

              {/* Company Admin Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
                <PWAInstallButton compact />

                <button
                  onClick={() => setIsCredentialsModalOpen(true)}
                  aria-label="گوهۆڕینا ناڤ و پاسوۆردی"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all shadow-sm"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#0284c7] dark:text-sky-400" />
                  <span className="hidden sm:inline">ناڤ و پاسوۆرد</span>
                </button>

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
                  onClick={() => void logout()}
                  aria-label="دەرکەفتن"
                  title="دەرکەفتن (Logout)"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/70 text-xs font-bold transition-all shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">دەرکەفتن</span>
                </button>

                <a
                  href="/index.html"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm"
                >
                  <span>کەتەلۆگێ فرۆشتنێ</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Main Admin Content */}
        <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 pt-4 flex-1">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-4">
            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-sm flex flex-col">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                کۆی بەرهەمان
              </span>
              <span className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white font-mono mt-0.5">
                {products.length}
              </span>
            </div>

            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-sm flex flex-col">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                کۆی کارتۆنان
              </span>
              <span className="text-lg sm:text-2xl font-black text-[#0284c7] dark:text-sky-400 font-mono mt-0.5">
                {totalCartons}
              </span>
            </div>

            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-sm flex flex-col">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                نەمایە (خلاس)
              </span>
              <span className="text-lg sm:text-2xl font-black text-red-600 dark:text-red-400 font-mono mt-0.5">
                {outOfStockCount}
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0284c7] hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>زێدەکرنا بەرهەمی</span>
              </button>

              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
              >
                <FolderTree className="w-4 h-4 text-sky-600" />
                <span>رێکخستنا بەشان ({categories.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportBackup}
                title="داونلۆدکرنا پاشەکەوتێ بەرهەمان"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>هەناردەکرنا پاشەکەوتێ (.json)</span>
              </button>

              <label
                title="ڤەگەراندن ژ فایلی"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 cursor-pointer transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>ڤەگەراندنا پاشەکەوتێ</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => void handleSeedCloudData(false)}
                title="بارکرنا داتایێن نموونە"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => void handleCloudSync()}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-sky-700 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                title="هەڤدەمکرنا داتایان دگەل فایەربەیس"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'د هێتە بارکرن...' : 'هەڤدەمکرن (Sync)'}</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm mb-4 space-y-2.5">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ل ناڤ بەرهەمێن کومگەهێ بگەرە..."
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

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-[#0284c7] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  هەمی بەش
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.name)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedCategory === c.name
                        ? 'bg-[#0284c7] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 text-[11px] font-semibold">
                <button
                  onClick={() => setFilterStock('all')}
                  className={`px-2 py-0.5 rounded-md ${
                    filterStock === 'all'
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  هەمی
                </button>
                <button
                  onClick={() => setFilterStock('in_stock')}
                  className={`px-2 py-0.5 rounded-md ${
                    filterStock === 'in_stock'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  ماینە
                </button>
                <button
                  onClick={() => setFilterStock('out_of_stock')}
                  className={`px-2 py-0.5 rounded-md ${
                    filterStock === 'out_of_stock'
                      ? 'bg-red-600 text-white font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  خلاس بووین
                </button>
              </div>
            </div>
          </div>

          {/* Product Items List */}
          {catalogLoading ? (
            <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
              <Loader2 className="w-8 h-8 text-[#0284c7] mx-auto mb-2 animate-spin" />
              <p className="text-xs font-bold text-slate-500">بەرهەم ژ فایەربەیس دهێنە بارکرن...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const stock = formatStockStatus(product.stockCartons, product.stockPieces);
                  const thumb =
                    product.images?.[0] ||
                    'https://images.unsplash.com/photo-1589881133595-a3c085cb731d?w=300&auto=format&fit=crop&q=80';

                  return (
                    <div
                      key={product.id}
                      className={`p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 transition-all ${
                        stock.isOutOfStock ? 'border-red-200 dark:border-red-950/60 bg-red-50/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <img
                            src={thumb}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                          {product.images?.length > 1 && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded-md bg-black/70 text-white text-[9px] font-mono">
                              {product.images.length}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-[#0284c7] dark:text-sky-300 text-[10px] font-bold">
                              {product.category}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {product.piecesPerCarton} دانە / کارتۆن
                            </span>
                          </div>

                          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate mb-1">
                            {product.title}
                          </h3>

                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-slate-600 dark:text-slate-400">
                              دانە:{' '}
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {formatPriceNumber(product.piecePrice)}
                              </span>{' '}
                              د.ع
                            </span>
                            <span className="text-[#0284c7] dark:text-sky-400 font-bold">
                              کارتۆن:{' '}
                              <span className="font-mono">
                                {formatPriceNumber(product.cartonPrice)}
                              </span>{' '}
                              د.ع
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-center gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 min-w-[110px]">
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            کارتۆنێن ماین
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => void handleAdjustStock(product.id, 'stockCartons', -1)}
                              disabled={product.stockCartons <= 0}
                              aria-label={`کێمکرنا کارتۆنان بۆ ${product.title}`}
                              className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-white disabled:opacity-40"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-black text-sm w-8 text-center text-[#0284c7] dark:text-sky-300">
                              {product.stockCartons}
                            </span>
                            <button
                              onClick={() => void handleAdjustStock(product.id, 'stockCartons', 1)}
                              aria-label={`زێدەکرنا کارتۆنان بۆ ${product.title}`}
                              className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-white"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 min-w-[110px]">
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            دانەیێن ماین
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => void handleAdjustStock(product.id, 'stockPieces', -1)}
                              disabled={product.stockPieces <= 0}
                              aria-label={`کێمکرنا دانەیان بۆ ${product.title}`}
                              className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-white disabled:opacity-40"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-black text-sm w-8 text-center text-slate-800 dark:text-slate-100">
                              {product.stockPieces}
                            </span>
                            <button
                              onClick={() => void handleAdjustStock(product.id, 'stockPieces', 1)}
                              aria-label={`زێدەکرنا دانەیان بۆ ${product.title}`}
                              className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-white"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setIsProductModalOpen(true);
                          }}
                          aria-label={`دەستکاریکرنا ${product.title}`}
                          className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => void handleDeleteProduct(product.id, product.title)}
                          aria-label={`ژێبرنا ${product.title}`}
                          className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
                  <Package className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    چ بەرهەم ل دەف ڤان فلتەران نینن
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    دەستکاریێ د فلتەران دا بکە یان بەرهەمەکێ نووی زێدە بکە.
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setEditingProduct(null);
                        setIsProductModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#0284c7] text-white text-xs font-bold shadow-md shadow-sky-600/20"
                    >
                      زێدەکرنا بەرهەمی
                    </button>
                    {products.length === 0 && (
                      <button
                        onClick={() => void handleSeedCloudData(true)}
                        disabled={isSyncing}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                      >
                        بارکرنا داتایێن نموونە بۆ کڵاودێ
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Category Modal */}
        <AdminCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          categories={categories}
          products={products}
          onSaveCategoriesAndProducts={(cats, prods) =>
            void handleSaveCategoriesAndProducts(cats, prods)
          }
        />

        {/* Product Add / Edit Modal */}
        <AdminProductModal
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
          productToEdit={editingProduct}
          categories={categories}
          onSaveProduct={(p) => void handleSaveProduct(p)}
        />

        {/* Company Admin Credentials Update Modal */}
        <AdminCredentialsModal
          isOpen={isCredentialsModalOpen}
          onClose={() => setIsCredentialsModalOpen(false)}
          currentUsername={currentAdminUsername}
          currentDisplayName={userProfile?.name || 'ئەدمینێ کومگەهێ'}
          onUpdated={() => showToast('ناڤ و پاسوۆرد ب سەرکەفتیانە هاتنە گوهۆڕین 🔐')}
        />
      </div>
    </PullToRefresh>
  );
}

function AdminGate({
  theme,
  toggleTheme,
}: {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}) {
  const { accessState, isAdmin, userProfile } = useFirebase();

  if (accessState === 'loading') {
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

  if (accessState === 'unauthenticated') {
    return <AdminLoginScreen theme={theme} onToggleTheme={toggleTheme} />;
  }

  if (accessState === 'no_profile') {
    return (
      <AdminLoginScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        notice="ئەڤ حسابە نەهاتیە تۆمارکرن یان هاتیە ژێبرن؛ ب ناڤ و پاسوۆردێ ئەدمینی بچۆ ژوور."
      />
    );
  }

  if (accessState === 'subscription_blocked') {
    return <SubscriptionLockScreen showBackToCatalog />;
  }

  // If a Sales Rep opens /admin on the same device, show the Company Admin Username+Password login
  if (!isAdmin) {
    return (
      <AdminLoginScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        notice={
          userProfile?.name
            ? `تو نۆکە وەک "${userProfile.name}" د کەتەلۆگێ دا ی؛ بۆ کۆنتڕۆلا کومگەهێ ناڤ و پاسوۆردێ ئەدمینی بنڤیسە.`
            : undefined
        }
      />
    );
  }

  return <AdminDashboard theme={theme} toggleTheme={toggleTheme} />;
}

function AdminRoot() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getStoredTheme());

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
  };

  return (
    <FirebaseProvider>
      <AdminGate theme={theme} toggleTheme={toggleTheme} />
    </FirebaseProvider>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<AdminRoot />);
}
