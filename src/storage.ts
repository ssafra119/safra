import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from './seedData.ts';
import { Category, Product, SafraBackup } from './types.ts';

const STORAGE_KEYS = {
  PRODUCTS: 'safra_wholesale_products_v1',
  CATEGORIES: 'safra_wholesale_categories_v1',
  THEME: 'safra_wholesale_theme_v1',
  VERSION: 'safra_db_version',
};

export function getInitialProducts(): Product[] {
  if (typeof window === 'undefined') return INITIAL_PRODUCTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_PRODUCTS;
  } catch (err) {
    console.error('Failed to read products from localStorage:', err);
    return INITIAL_PRODUCTS;
  }
}

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('safra_storage_sync');
  } catch (e) {
    // Fallback gracefully if BroadcastChannel is blocked
  }
}

function broadcastSync(type: 'products' | 'categories' | 'all') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('safra_storage_update', { detail: { type } }));
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type });
    } catch (e) {}
  }
}

export function subscribeToStorageChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleUpdate = () => callback();

  window.addEventListener('storage', handleUpdate);
  window.addEventListener('safra_storage_update', handleUpdate);

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleUpdate);
  }

  return () => {
    window.removeEventListener('storage', handleUpdate);
    window.removeEventListener('safra_storage_update', handleUpdate);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleUpdate);
    }
  };
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`Could not write ${key} to localStorage:`, err);
    return false;
  }
}

export function saveProducts(products: Product[]): void {
  safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  broadcastSync('products');
}

export function getInitialCategories(): Category[] {
  if (typeof window === 'undefined') return INITIAL_CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) {
      safeSetItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_CATEGORIES;
  } catch (err) {
    console.warn('Failed to read categories from localStorage:', err);
    return INITIAL_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  safeSetItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  broadcastSync('categories');
}

export function saveCategoriesAndProducts(categories: Category[], products: Product[]): void {
  safeSetItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  broadcastSync('all');
}

export function exportBackupData(): SafraBackup {
  const products = getInitialProducts();
  const categories = getInitialCategories();
  return {
    version: '1.0.0',
    company: 'Safra Wholesale (سەفرا)',
    exportedAt: new Date().toISOString(),
    categories,
    products,
  };
}

export function downloadBackupFile(): void {
  const data = exportBackupData();
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'safra_backup.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importBackupData(jsonString: string): { success: boolean; count: number; error?: string } {
  try {
    const data = JSON.parse(jsonString) as Partial<SafraBackup>;
    if (!data || typeof data !== 'object') {
      return { success: false, count: 0, error: 'فایلی فۆرماتێ نادروستە' };
    }

    if (!Array.isArray(data.products) || !Array.isArray(data.categories)) {
      return { success: false, count: 0, error: 'داتایێن بەرهەمان یان بەشان د فایلی دا نینن' };
    }

    saveCategories(data.categories);
    saveProducts(data.products);

    return { success: true, count: data.products.length };
  } catch {
    return { success: false, count: 0, error: 'خاندنا فایلی سەرنەکەفت (JSON Error)' };
  }
}

export function resetToSeedData(): void {
  saveCategories(INITIAL_CATEGORIES);
  saveProducts(INITIAL_PRODUCTS);
}

export function getStoredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Ignore SecurityError when third-party/private storage is blocked
  }
  try {
    return typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  } catch {
    return 'light';
  }
}

export function setStoredTheme(theme: 'light' | 'dark'): void {
  safeSetItem(STORAGE_KEYS.THEME, theme);
  try {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch {
    // Ignore DOM errors
  }
}
