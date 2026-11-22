import React, { useState, useEffect, useMemo } from 'react';
import { Search, Settings, X, Package, ShoppingBag, Loader2 } from 'lucide-react';
import type { Product } from './types.ts';
import { filterProducts } from './utils/stock.ts';
import { getStoredTheme, setStoredTheme } from './storage.ts';
import { useFirebase } from './context/FirebaseContext.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductModal } from './components/ProductModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { PullToRefresh } from './components/PullToRefresh.tsx';
import { PhonePinLoginScreen } from './components/PhonePinLoginScreen.tsx';
import { SubscriptionLockScreen } from './components/SubscriptionLockScreen.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';

export default function App() {
  const {
    accessState,
    products,
    categories,
    catalogLoading,
  } = useFirebase();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => getStoredTheme());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
  };

  // If active selected category is removed or renamed, update selectedCategory safely
  useEffect(() => {
    if (selectedCategory !== 'all' && categories.length > 0) {
      const exists = categories.some((c) => c.name === selectedCategory);
      if (!exists) {
        setSelectedCategory('all');
      }
    }
  }, [categories, selectedCategory]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return filterProducts(products, searchQuery, selectedCategory);
  }, [products, searchQuery, selectedCategory]);

  // Compute category product counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: products.length };
    for (const p of products) {
      map[p.category] = (map[p.category] || 0) + 1;
    }
    return map;
  }, [products]);

  // Pull-to-refresh subtle feedback (Firestore onSnapshot already updates live)
  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 450));
  };

  // 1. Loading State
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

  // 2. Unauthenticated -> Phone + 6-digit PIN Login ONLY (No Public Registration)
  if (accessState === 'unauthenticated') {
    return (
      <PhonePinLoginScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        title="چوونەژوور بۆ کەتەلۆگێ سەفرا"
        subtitle="ژمارەیا موبایلێ و پاسوۆرد یان کۆدێ نهێنی بنڤیسە"
      />
    );
  }

  // 3. No profile / deleted account
  if (accessState === 'no_profile') {
    return (
      <SubscriptionLockScreen message="⚠️ ئەڤ حسابە نەهاتیە تۆمارکرن یان هاتیە ژێبرن، بۆ پەیوەندیکرنێ پەیوەندیێ ب رێڤەبەری بکە." />
    );
  }

  // 4. Instant Kill-Switch: Blocked or Expired subscription
  if (accessState === 'subscription_blocked') {
    return <SubscriptionLockScreen />;
  }

  // 5. Authorized Active Catalog
  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-[#f0f7ff] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-[#0284c7] selection:text-white pb-12">
        {/* Sticky Header with Glassmorphism */}
        <header className="sticky top-0 z-30 glass-header shadow-sm transition-all">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 pb-2.5">
            {/* Top Row: Brand & Quick Actions */}
            <div className="flex items-center justify-between mb-3 gap-2">
              {/* Brand Logo & Title */}
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0284c7] to-sky-400 flex items-center justify-center text-white shadow-md shadow-sky-500/25">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-wide">
                      سەفرا <span className="text-[#0284c7] dark:text-sky-400 font-sans font-black">SAFRA</span>
                    </h1>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-[#0284c7] dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      کۆمگەهـ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    کەتەلۆگێ بەلاڤکرنا گشتی (شیرەمەنی، سناکس، پاقژکەر)
                  </p>
                </div>
              </div>

              {/* Action Buttons: PWA Install & Settings */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <PWAInstallButton compact />
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  aria-label="رێکخستن"
                  className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Live Search Bar */}
            <div className="relative mb-2.5">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ل ناڤ بەرهەماندا بگەرە (پەنیر، چپس، زاهی...)"
                className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-2xl bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="پاکژکرنا گەڕیانێ"
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Horizontal Scrollable Category Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/25'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <span>هەمی</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedCategory === 'all'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {categoryCounts['all'] || 0}
                </span>
              </button>

              {categories.map((cat) => {
                const count = categoryCounts[cat.name] || 0;
                const isSelected = selectedCategory === cat.name;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/25'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    {cat.icon && <span>{cat.icon}</span>}
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 pt-4 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3 px-1">
            <span>
              هەژمارا بەرهەمان:{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                {filteredProducts.length}
              </strong>
            </span>
            {searchQuery && (
              <span className="text-sky-600 dark:text-sky-400">
                ئەنجامێن گەڕیانێ بۆ: "{searchQuery}"
              </span>
            )}
          </div>

          {catalogLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-sky-100 dark:border-slate-800 overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-slate-200 dark:bg-slate-800" />
                  <div className="p-3 space-y-2">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => setActiveProduct(product)}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-slate-900 flex items-center justify-center text-[#0284c7] mb-3">
                <Package className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                چ بەرهەم نەهاتنە دیتن
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
                تکایە پەیڤەکا دی تاقی بکە یان پۆلێنەکا دی هەلبژێرە.
              </p>
              {(searchQuery || selectedCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0284c7] text-white text-xs font-bold shadow-md shadow-sky-600/20"
                >
                  نیشاندانا هەمی بەرهەمان
                </button>
              )}
            </div>
          )}
        </main>

        {/* Product Modal with Instagram-style Carousel */}
        <ProductModal product={activeProduct} onClose={() => setActiveProduct(null)} />

        {/* Settings Modal */}
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    </PullToRefresh>
  );
}
