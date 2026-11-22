import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Package, Layers, AlertTriangle, Phone, Copy, Check } from 'lucide-react';
import type { Product } from '../types.ts';
import { formatPrice, formatStockStatus } from '../utils/stock.ts';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveIndex(0);
    setCopied(false);
  }, [product]);

  if (!product) return null;

  const images = product.images && product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1589881133595-a3c085cb731d?w=800&auto=format&fit=crop&q=80'];

  const stock = formatStockStatus(product.stockCartons, product.stockPieces);

  // Handle horizontal scroll to update live slide counter (e.g., "1/3")
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollLeft = Math.abs(container.scrollLeft);
    const width = container.clientWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < images.length) {
        setActiveIndex(newIndex);
      }
    }
  };

  const scrollToImage = (index: number) => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    // In RTL, scroll direction depends on browser implementation, so we use scrollIntoView on child elements
    const child = scrollRef.current.children[index] as HTMLElement;
    if (child) {
      child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      setActiveIndex(index);
    }
  };

  const handleCopyDetails = () => {
    const text = `سەفرا (SAFRA) - داواکاری\nبەرهەم: ${product.title}\nبەش: ${product.category}\nدانە د کارتۆنیدا: ${product.piecesPerCarton}\nبهایێ دانێ: ${formatPrice(product.piecePrice)}\nبهایێ کارتۆنی: ${formatPrice(product.cartonPrice)}\nمەخزەن: ${stock.label}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-2xl overflow-hidden text-right">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/50">
              {product.category}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="داخستن"
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Instagram-Style Image Carousel */}
          <div className="relative w-full aspect-square bg-slate-950 select-none overflow-hidden group">
            {/* Native Touch/Scroll-Snap Carousel */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="w-full h-full flex overflow-x-auto touch-snap-x snap-mandatory no-scrollbar"
              style={{ scrollBehavior: 'smooth' }}
            >
              {images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="snap-item w-full h-full shrink-0 flex items-center justify-center bg-black/20"
                >
                  <img
                    src={imgUrl}
                    alt={`${product.title} - ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Live Instagram Slide Counter Badge (e.g. "1/3") */}
            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-md text-white text-xs font-semibold font-mono tracking-wider border border-white/10 shadow-sm">
              {activeIndex + 1}/{images.length}
            </div>

            {/* Desktop Navigation Arrows (hidden on small touch screens) */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => scrollToImage(Math.max(0, activeIndex - 1))}
                  disabled={activeIndex === 0}
                  aria-label="وێنەیێ بەرێ"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 text-white backdrop-blur-sm transition-all ${
                    activeIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollToImage(Math.min(images.length - 1, activeIndex + 1))}
                  disabled={activeIndex === images.length - 1}
                  aria-label="وێنەیێ دووڤدا"
                  className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 text-white backdrop-blur-sm transition-all ${
                    activeIndex === images.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Carousel Dots */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center items-center gap-1.5 pointer-events-none">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === activeIndex
                        ? 'w-6 bg-sky-500 shadow-md'
                        : 'w-1.5 bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Info Section */}
          <div className="p-4 sm:p-5 flex flex-col gap-4">
            {/* Title */}
            <div>
              <h2
                id="modal-product-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug"
              >
                {product.title}
              </h2>
            </div>

            {/* Inventory Status Banner */}
            <div
              className={`p-3 rounded-2xl flex items-center justify-between gap-2 border ${
                stock.isOutOfStock
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {stock.isOutOfStock ? (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                ) : (
                  <Package className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <span>مەخزەن / کومگەهـ:</span>
              </div>
              <span className="font-extrabold text-sm sm:text-base">
                {stock.label}
              </span>
            </div>

            {/* Pricing & Carton Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Piece Price Card */}
              <div className="p-3 rounded-2xl bg-sky-50/60 dark:bg-slate-800/60 border border-sky-100 dark:border-slate-700/60 flex flex-col">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  بهایێ دانێ (یەک دانە)
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {formatPrice(product.piecePrice)}
                </span>
              </div>

              {/* Carton Price Card */}
              <div className="p-3 rounded-2xl bg-[#0284c7]/10 dark:bg-sky-950/60 border border-[#0284c7]/20 dark:border-sky-800/60 flex flex-col">
                <span className="text-xs text-[#0284c7] dark:text-sky-300 font-semibold">
                  بهایێ کارتۆنی (تەمام)
                </span>
                <span className="text-base sm:text-lg font-black text-[#0284c7] dark:text-sky-300 mt-1">
                  {formatPrice(product.cartonPrice)}
                </span>
              </div>
            </div>

            {/* Pieces Per Carton Note */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-500" />
                <span>دانە د هەر کارتۆنەکێدا:</span>
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {product.piecesPerCarton} دانە
              </span>
            </div>

            {/* Actions: Copy & Quick Contact */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCopyDetails}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold transition-all active:scale-[0.98]"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>کۆپی بوو!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-sky-600" />
                    <span>کۆپیکرنا داواکاریێ</span>
                  </>
                )}
              </button>

              <a
                href="tel:07507100238"
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-600/20 transition-all active:scale-[0.98]"
              >
                <Phone className="w-4 h-4" />
                <span>پەیوەندی کرن</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
