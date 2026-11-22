import React, { useState, useEffect } from 'react';
import { X, Upload, Link as LinkIcon, Sparkles, AlertCircle, Image as ImageIcon, Trash2, Check } from 'lucide-react';
import type { Category, Product } from '../types.ts';
import {
  calculateCartonPrice,
  compressImageFile,
  normalizeEnglishDigits,
  parseFlexibleNumber,
  validateProduct,
} from '../utils/stock.ts';

interface AdminProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit: Product | null;
  categories: Category[];
  onSaveProduct: (product: Product) => void;
}

function sanitizeDecimalInput(raw: string): string {
  const normalized = normalizeEnglishDigits(raw).replace(/[^0-9.]/g, '');
  const parts = normalized.split('.');
  if (parts.length <= 1) return normalized;
  return `${parts[0]}.${parts.slice(1).join('')}`;
}

function sanitizeIntegerInput(raw: string): string {
  return normalizeEnglishDigits(raw).replace(/[^0-9]/g, '');
}

export const AdminProductModal: React.FC<AdminProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  categories,
  onSaveProduct,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [piecesPerCarton, setPiecesPerCarton] = useState<string>('12');
  const [piecePrice, setPiecePrice] = useState<string>('1500');
  const [cartonPrice, setCartonPrice] = useState<string>('18000');
  const [stockCartons, setStockCartons] = useState<string>('20');
  const [stockPieces, setStockPieces] = useState<string>('0');
  const [images, setImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (productToEdit) {
      setTitle(productToEdit.title);
      setCategory(productToEdit.category);
      setPiecesPerCarton(String(productToEdit.piecesPerCarton));
      setPiecePrice(String(productToEdit.piecePrice));
      setCartonPrice(String(productToEdit.cartonPrice));
      setStockCartons(String(productToEdit.stockCartons));
      setStockPieces(String(productToEdit.stockPieces));
      setImages(productToEdit.images || []);
      setUrlInput('');
    } else {
      setTitle('');
      setCategory(categories[0]?.name || 'شیرەمەنی');
      setPiecesPerCarton('12');
      setPiecePrice('1500');
      setCartonPrice('18000');
      setStockCartons('25');
      setStockPieces('0');
      setImages([]);
      setUrlInput('');
    }
    setErrors([]);
  }, [productToEdit, categories, isOpen]);

  if (!isOpen) return null;

  // Auto calculate carton price
  const handleAutoCalcCarton = () => {
    const pPrice = parseFlexibleNumber(piecePrice);
    const pCount = parseFlexibleNumber(piecesPerCarton);
    const calc = calculateCartonPrice(
      Number.isFinite(pPrice) ? pPrice : 0,
      Number.isFinite(pCount) ? pCount : 1
    );
    setCartonPrice(String(calc));
  };

  // Upload and compress multiple images from phone gallery / file system
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    try {
      const compressedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          // Compress to max 500x500 at 0.7 JPEG quality
          const compressed = await compressImageFile(file, 500, 500, 0.7);
          compressedUrls.push(compressed);
        }
      }
      setImages((prev) => [...prev, ...compressedUrls]);
    } catch (err) {
      console.error('Image compression failed:', err);
      alert('خەلەتەک پەیدابوو د بارکرنا وێنەیان دا');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  // Add URLs from textarea
  const handleAddUrls = () => {
    if (!urlInput.trim()) return;
    const lines = urlInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http://') || l.startsWith('https://') || l.startsWith('data:image/'));

    if (lines.length > 0) {
      setImages((prev) => [...prev, ...lines]);
      setUrlInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [chosen] = next.splice(index, 1);
      next.unshift(chosen);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const productData: Partial<Product> = {
      title: title.trim(),
      category: category.trim(),
      piecesPerCarton: parseFlexibleNumber(piecesPerCarton),
      piecePrice: parseFlexibleNumber(piecePrice),
      cartonPrice: parseFlexibleNumber(cartonPrice),
      stockCartons: parseFlexibleNumber(stockCartons),
      stockPieces: parseFlexibleNumber(stockPieces),
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1589881133595-a3c085cb731d?w=500&auto=format&fit=crop&q=80'],
    };

    const validation = validateProduct(productData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const finalProduct: Product = {
      id: productToEdit ? productToEdit.id : `prod-${Date.now()}`,
      title: productData.title!,
      category: productData.category!,
      piecesPerCarton: productData.piecesPerCarton!,
      piecePrice: productData.piecePrice!,
      cartonPrice: productData.cartonPrice!,
      stockCartons: productData.stockCartons!,
      stockPieces: productData.stockPieces!,
      images: productData.images!,
      createdAt: productToEdit ? productToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(finalProduct);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-2xl overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
          <h2 id="product-modal-title" className="text-base font-bold text-slate-800 dark:text-white">
            {productToEdit ? 'دەستکاریکرنا بەرهەمی' : 'زێدەکرنا بەرهەمێ نووی'}
          </h2>
          <button
            onClick={onClose}
            aria-label="داخستن"
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
          {/* Error Banner */}
          {errors.length > 0 && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs space-y-1">
              {errors.map((err, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ناڤێ بەرهەمی *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="بۆ نموونە: پەنیرێ سپی یێ سەفرا 500 گرام"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            />
          </div>

          {/* Category Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              پۆلێن / بەش *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.icon || '📦'} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pieces & Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Pieces Per Carton */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                دانە د هەر کارتۆنێدا *
              </label>
              <input
                type="text"
                inputMode="numeric"
                dir="ltr"
                required
                value={piecesPerCarton}
                onChange={(e) => setPiecesPerCarton(sanitizeIntegerInput(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-right text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>

            {/* Piece Price */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                بهایێ دانێ (د.ع) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                required
                placeholder="بۆ نموونە: 1100"
                value={piecePrice}
                onChange={(e) => setPiecePrice(sanitizeDecimalInput(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-right text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>

            {/* Carton Price */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  بهایێ کارتۆنی *
                </label>
                <button
                  type="button"
                  onClick={handleAutoCalcCarton}
                  className="text-[10px] text-[#0284c7] hover:underline font-semibold flex items-center gap-0.5"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>هەژمارکرن</span>
                </button>
              </div>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                required
                placeholder="بۆ نموونە: 2400"
                value={cartonPrice}
                onChange={(e) => setCartonPrice(sanitizeDecimalInput(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono font-bold text-right text-[#0284c7] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>
          </div>

          {/* Exact Stock Management (Cartons & Loose Pieces) */}
          <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50">
            <h4 className="text-xs font-bold text-[#0284c7] dark:text-sky-300 mb-2 flex items-center gap-1.5">
              <span>رێژا ماین د کومگەهێ دا (Stock Management)</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  کارتۆنێن ماین
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  required
                  value={stockCartons}
                  onChange={(e) => setStockCartons(sanitizeIntegerInput(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-right text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  دانەیێن ماین (تاک)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  required
                  value={stockPieces}
                  onChange={(e) => setStockPieces(sanitizeIntegerInput(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-right text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                />
              </div>
            </div>
          </div>

          {/* Dual Image Uploading */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-sky-600" />
              <span>وێنەیێن بەرهەمی (Dual Upload: گەلەری + لینک)</span>
            </h4>

            {/* 1. File Upload from Gallery with Canvas Compression */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                1. بارکرن ژ گەلەریێ (هەڤپێچکرنا ژمارەکا وێنەیان دگەل قەبارەکرنا خۆڕسک):
              </label>
              <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-100/50 cursor-pointer transition-colors text-xs font-bold text-[#0284c7] dark:text-sky-300">
                <Upload className="w-4 h-4" />
                <span>
                  {isCompressing ? 'قەبارە دکەت و بار دکەت...' : 'هەلبژارتنا وێنەیان ژ گەلەریێ'}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isCompressing}
                />
              </label>
            </div>

            {/* 2. Direct Image URLs Textarea */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                2. یان نڤیسینا لینکێن وێنەیان (ئێک لینک د هەر هێڵەکێدا):
              </label>
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0284c7]"
                />
                <button
                  type="button"
                  onClick={handleAddUrls}
                  className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold self-end"
                >
                  زێدەکرنا لینک
                </button>
              </div>
            </div>

            {/* Images Preview Grid */}
            {images.length > 0 && (
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  وێنەیێن هاتینە دانان ({images.length}):
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/10"
                    >
                      <img
                        src={img}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-600 text-white">
                          سەرەکی
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(idx)}
                            title="بکە وێنەیێ سەرەکی"
                            className="p-1 rounded bg-sky-600 text-white text-[10px]"
                          >
                            ⭐
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          aria-label={`ژێبرنا وێنەی ${idx + 1}`}
                          className="p-1 rounded bg-red-600 text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold transition-all"
            >
              پاشگەزبوون
            </button>
            <button
              type="submit"
              disabled={isCompressing}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#0284c7] hover:bg-sky-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-600/20 transition-all"
            >
              {productToEdit ? 'پاشەکەوتکرنا دەستکاریێ' : 'تۆمارکرنا بەرهەمی'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
