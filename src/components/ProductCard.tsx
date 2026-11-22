import React from 'react';
import { Camera, Package, AlertTriangle, Layers } from 'lucide-react';
import type { Product } from '../types.ts';
import { formatPrice, formatStockStatus } from '../utils/stock.ts';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const stock = formatStockStatus(product.stockCartons, product.stockPieces);
  const mainImage = product.images?.[0] || 'https://images.unsplash.com/photo-1589881133595-a3c085cb731d?w=500&auto=format&fit=crop&q=80';
  const photoCount = product.images?.length || 1;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`تەماشاکرنا بەرهەمی: ${product.title}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer text-right select-none active:scale-[0.98] ${
        stock.isOutOfStock ? 'safra-out-of-stock' : ''
      }`}
    >
      {/* 1:1 Square Image Container */}
      <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <img
          src={mainImage}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Photo Count Badge (e.g. 📷 3) */}
        {photoCount > 0 && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/70 backdrop-blur-md text-white text-[11px] font-semibold tracking-wider">
            <Camera className="w-3 h-3 text-sky-300" />
            <span className="font-mono">{photoCount}</span>
          </div>
        )}

        {/* Category Pill Tag */}
        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-sky-600/90 backdrop-blur-md text-white text-[10px] font-medium max-w-[70%] truncate">
          {product.category}
        </div>

        {/* Out of Stock Overlay Badge */}
        {stock.isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-2 z-20">
            <div className="bg-red-600/95 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-lg border border-red-400 flex items-center gap-1.5 text-center">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>⚠️ نە مایە (خلاس)</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Details Body */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3 justify-between">
        <div>
          {/* Product Title */}
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight mb-1.5 h-8 sm:h-9">
            {product.title}
          </h3>

          {/* Pieces Per Carton */}
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <Layers className="w-3 h-3 text-sky-600 shrink-0" />
            <span>
              {product.piecesPerCarton} دانە د کارتۆنیدا
            </span>
          </div>
        </div>

        {/* Price & Stock Section */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
          {/* Piece Price & Carton Price */}
          <div className="flex items-baseline justify-between text-right gap-1">
            <div className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400">
              <span className="opacity-75">دانە: </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatPrice(product.piecePrice)}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs font-black text-[#0284c7] dark:text-sky-400">
              <span className="text-[10px] opacity-75">کارتۆن: </span>
              <span>{formatPrice(product.cartonPrice)}</span>
            </div>
          </div>

          {/* Stock Status Tag */}
          <div
            className={`text-[10.5px] sm:text-[11.5px] font-semibold px-2 py-1 rounded-lg text-center truncate ${
              stock.isOutOfStock
                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
            }`}
          >
            {stock.label}
          </div>
        </div>
      </div>
    </div>
  );
};
