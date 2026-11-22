import type { Product } from '../types.ts';

/**
 * Checks stock and formats stock status strictly using English numerals.
 * If cartons === 0 and pieces === 0, it is out of stock.
 */
export function formatStockStatus(cartons: number, pieces: number): {
  isOutOfStock: boolean;
  label: string;
} {
  const safeCartons = Math.max(0, Math.floor(Number(cartons) || 0));
  const safePieces = Math.max(0, Math.floor(Number(pieces) || 0));

  if (safeCartons === 0 && safePieces === 0) {
    return {
      isOutOfStock: true,
      label: '⚠️ نە مایە (خلاس)',
    };
  }

  return {
    isOutOfStock: false,
    label: `ماینە: ${safeCartons} کارتون و ${safePieces} دانە`,
  };
}

/**
 * Formats just the numerical portion of a price in standard English numerals with commas.
 */
export function formatPriceNumber(amount: number): string {
  const safeAmount = Math.max(0, Number(amount) || 0);
  return new Intl.NumberFormat('en-US').format(safeAmount);
}

/**
 * Formats a monetary price in standard English numerals with commas and currency symbol.
 */
export function formatPrice(amount: number): string {
  return `${formatPriceNumber(amount)} د.ع`;
}

/**
 * Calculates total carton price given single piece price and pieces per carton.
 */
export function calculateCartonPrice(piecePrice: number, piecesPerCarton: number): number {
  const safePrice = Math.max(0, Number(piecePrice) || 0);
  const safePieces = Math.max(1, Math.floor(Number(piecesPerCarton) || 1));
  return safePrice * safePieces;
}

/**
 * Normalizes Arabic/Kurdish/Persian digits (٠-٩, ۰-۹) to standard English numerals (0-9).
 */
export function normalizeEnglishDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/,/g, '');
}

/**
 * Parses a numeric string (supporting Kurdish/Arabic/English digits) into a number,
 * returning NaN if blank or invalid.
 */
export function parseFlexibleNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  const cleaned = normalizeEnglishDigits(String(value ?? '')).trim();
  if (cleaned === '') return Number.NaN;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * Validates a product before saving to storage.
 */
export function validateProduct(product: Partial<Product>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!product.title || product.title.trim().length === 0) {
    errors.push('ناڤێ بەرهەمی پێتڤیە بهێتە نڤیسین');
  }

  if (!product.category || product.category.trim().length === 0) {
    errors.push('پێتڤیە بەشەک بهێتە دیارکرن');
  }

  if (
    product.piecesPerCarton === undefined ||
    !Number.isFinite(product.piecesPerCarton) ||
    product.piecesPerCarton <= 0
  ) {
    errors.push('هەژمارا دانەیان د هەر کارتۆنەکێدا پێتڤیە مەزنتر بیت ژ 0');
  }

  if (
    product.piecePrice === undefined ||
    !Number.isFinite(product.piecePrice) ||
    product.piecePrice < 0
  ) {
    errors.push('بهایێ دانێ نادروستە');
  }

  if (
    product.cartonPrice === undefined ||
    !Number.isFinite(product.cartonPrice) ||
    product.cartonPrice < 0
  ) {
    errors.push('بهایێ کارتۆنی نادروستە');
  }

  if (
    product.stockCartons === undefined ||
    !Number.isFinite(product.stockCartons) ||
    product.stockCartons < 0
  ) {
    errors.push('کارتۆنێن ماین نادروستن');
  }

  if (
    product.stockPieces === undefined ||
    !Number.isFinite(product.stockPieces) ||
    product.stockPieces < 0
  ) {
    errors.push('دانەیێن ماین نادروستن');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Filters a product catalog by search query and category.
 */
export function filterProducts(
  products: Product[],
  searchQuery: string,
  selectedCategory: string
): Product[] {
  const query = (searchQuery || '').trim().toLowerCase();

  return products.filter((item) => {
    // Category check
    if (selectedCategory && selectedCategory !== 'all' && selectedCategory !== 'هەمی') {
      if (item.category !== selectedCategory) {
        return false;
      }
    }

    // Search query check
    if (query) {
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchCategory = item.category.toLowerCase().includes(query);
      if (!matchTitle && !matchCategory) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Compresses an image file in the browser using HTML5 Canvas to max 500x500 at 0.7 JPEG quality
 * to keep LocalStorage consumption minimal.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 500,
  maxHeight = 500,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('نەشییا وێنەی بار بکەت'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('نەشییا فایلی بخوینیت'));
    reader.readAsDataURL(file);
  });
}
