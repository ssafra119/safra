import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  FolderTree,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { Category, Product } from '../types.ts';
import { reorderCategories, renameCategoryInProducts, handleCategoryDeletion } from '../utils/category.ts';

interface AdminCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  products: Product[];
  onSaveCategoriesAndProducts: (newCategories: Category[], newProducts: Product[]) => void;
}

const POPULAR_EMOJIS = ['🥛', '🍟', '✨', '🧀', '🍫', '🧃', '🧼', '☕', '🧴', '🥫', '🥖', '🍎', '🥩', '🧊', '📦', '🍪', '🍬', '🧹'];

export const AdminCategoryModal: React.FC<AdminCategoryModalProps> = ({
  isOpen,
  onClose,
  categories,
  products,
  onSaveCategoriesAndProducts,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🥛');
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // In-line editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');

  if (!isOpen) return null;

  const showNotice = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 2500);
  };

  // 1. ADD CATEGORY
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setErrorMsg('تکایە ناڤێ بەشی بنڤیسە');
      return;
    }

    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg('ئەڤ بەشە بەرێ هەیە!');
      return;
    }

    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name: trimmed,
      icon: newCatIcon || '📦',
    };

    const updatedCategories = [...categories, newCategory];
    onSaveCategoriesAndProducts(updatedCategories, products);
    setNewCatName('');
    showNotice(`بەشێ "${trimmed}" ب سەرکەفتی هاتە زێدەکرن`);
  };

  // 2. START EDITING
  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon || '📦');
    setErrorMsg('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditIcon('');
  };

  // 3. SAVE EDIT & RENAME
  const handleSaveEdit = (catId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setErrorMsg('ناڤێ بەشی ناهێتە هێلان ب بەتاڵی');
      return;
    }

    const currentCat = categories.find((c) => c.id === catId);
    if (!currentCat) return;

    // Check if another category already has this name
    if (
      categories.some(
        (c) => c.id !== catId && c.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setErrorMsg('بەشەکێ دی ب ڤی ناڤی هەیە!');
      return;
    }

    const oldName = currentCat.name;
    const updatedCategories = categories.map((c) =>
      c.id === catId ? { ...c, name: trimmed, icon: editIcon || '📦' } : c
    );

    // Sync renamed category in all products
    const updatedProducts = renameCategoryInProducts(products, oldName, trimmed);

    onSaveCategoriesAndProducts(updatedCategories, updatedProducts);
    setEditingId(null);
    showNotice(`دەستکاری د بەشێ "${trimmed}" دا هاتە پاراستن`);
  };

  // 4. DELETE CATEGORY
  const handleDeleteCategory = (cat: Category) => {
    const productsInCat = products.filter((p) => p.category === cat.name);
    const count = productsInCat.length;

    let confirmMsg = `ئەرێ تو دپشتڕاستی ژێبرنا بەشێ "${cat.name}"؟`;
    if (count > 0) {
      confirmMsg = `ئاگاداری: ${count} بەرهەم د بەشێ "${cat.name}" دانە! پشتی ژێبرنێ دێ بەرهەم هێنە ڤەگوهاستن بۆ بەشێ "گشتی". ئەرێ بەردەوام بی؟`;
    }

    if (!window.confirm(confirmMsg)) return;

    const updatedCategories = categories.filter((c) => c.id !== cat.id);
    const updatedProducts = count > 0 ? handleCategoryDeletion(products, cat.name, 'گشتی') : products;

    onSaveCategoriesAndProducts(updatedCategories, updatedProducts);
    showNotice(`بەشێ "${cat.name}" هاتە ژێبرن`);
  };

  // 5. REORDER CATEGORIES (MOVE UP / DOWN)
  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = reorderCategories(categories, index, targetIndex);
    onSaveCategoriesAndProducts(reordered, products);
    showNotice('رێزبەندیا بەشان هاتە گوهۆڕین');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-management-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-2xl overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-[#0284c7] dark:text-sky-300">
              <FolderTree className="w-4 h-4" />
            </div>
            <div>
              <h2 id="category-management-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                رێکخستنا بەشێن کەتەلۆگی (Categories)
              </h2>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                زێدەکرن، دەستکاریکرن، رێزبەندیکرن و ژێبرنا بەشان
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="داخستن"
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice feedback banner */}
        {successNotice && (
          <div className="px-5 py-2 bg-emerald-500 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5 space-y-4">
          {/* Add Category Card */}
          <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-slate-800/60 border border-sky-100 dark:border-slate-700/80">
            <h3 className="text-xs font-bold text-[#0284c7] dark:text-sky-300 mb-2.5 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>زێدەکرنا بەشێ نووی (Add Category)</span>
            </h3>

            <form onSubmit={handleAddCategory} className="space-y-3">
              {/* Quick Emoji Bar */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  ئایکۆن یان ئیمۆجیێ بەشی:
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCatIcon(emoji)}
                      className={`w-8 h-8 rounded-lg text-base shrink-0 flex items-center justify-center transition-all ${
                        newCatIcon === emoji
                          ? 'bg-[#0284c7] text-white scale-110 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input + Custom Emoji + Submit */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-1">
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    placeholder="ئایکۆن"
                    title="ئیمۆجیێ دڵخواز بنڤیسە"
                    className="w-12 px-1 py-2 text-center text-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                  />

                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="ناڤێ بەشی بنڤیسە (وەک: شیرەمەنی، پسکیت)..."
                    className="flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                  />
                </div>

                <button
                  type="submit"
                  aria-label="تۆمارکرن و زێدەکرنا بەشی"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0284c7] hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>زێدەکرنا بەشی</span>
                </button>
              </div>

              {errorMsg && (
                <p className="text-red-500 text-xs font-medium flex items-center gap-1 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </p>
              )}
            </form>
          </div>

          {/* Categories List with Reorder, Edit and Delete */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                بەشێن کەتەلۆگی ({categories.length}):
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                تێبینی: رێزبەندی دێ راستەوخۆ ل سەر کەتەلۆگی هێتە گوهۆڕین
              </span>
            </div>

            <div className="space-y-2">
              {categories.map((cat, index) => {
                const count = products.filter((p) => p.category === cat.name).length;
                const isEditing = editingId === cat.id;

                if (isEditing) {
                  return (
                    /* Inline Editing Mode */
                    <div
                      key={cat.id}
                      className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border-2 border-sky-400 dark:border-sky-600 space-y-2"
                    >
                      <span className="text-[11px] font-bold text-[#0284c7] dark:text-sky-300">
                        دەستکاریکرنا بەشێ: {cat.name}
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editIcon}
                          onChange={(e) => setEditIcon(e.target.value)}
                          className="w-12 px-1 py-1.5 text-center text-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id)}
                          aria-label={`پاراستنا دەستکاریێ بۆ ${cat.name}`}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>پاراستن</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          aria-label="پاشگەزبوون"
                          className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  /* Standard Category Row */
                  <div
                    key={cat.id}
                    className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2 transition-all hover:border-sky-300 dark:hover:border-slate-600"
                  >
                    {/* Left: Reorder Buttons + Index */}
                    <div className="flex items-center gap-1">
                      {/* Sequence Badge strictly in English numerals */}
                      <span className="w-7 text-center text-[11px] font-bold text-slate-400 font-mono" dir="ltr">
                        #{index + 1}
                      </span>

                      {/* Move Up Button */}
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(index, 'up')}
                        disabled={index === 0}
                        aria-label={`ببە پێشڤە: ${cat.name}`}
                        title="پێشڤە برن"
                        className="p-1 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-600 disabled:opacity-30 border border-slate-200 dark:border-slate-600"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down Button */}
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(index, 'down')}
                        disabled={index === categories.length - 1}
                        aria-label={`ببە پاشڤە: ${cat.name}`}
                        title="پاشڤە برن"
                        className="p-1 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-600 disabled:opacity-30 border border-slate-200 dark:border-slate-600"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Middle: Icon & Name (Clickable to Edit) */}
                    <div
                      onClick={() => handleStartEdit(cat)}
                      className="flex-1 flex items-center gap-2 cursor-pointer group px-1"
                      title="کلیک بکە بۆ دەستکاریکرنا ناڤی"
                    >
                      <span className="text-lg">{cat.icon || '📦'}</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#0284c7] dark:group-hover:text-sky-300 transition-colors">
                        {cat.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        <span className="font-mono font-bold">{count}</span> بەرهەم
                      </span>
                    </div>

                    {/* Right: Actions (Edit & Delete) */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        aria-label={`دەستکاریکرنا بەشێ ${cat.name}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#0284c7] hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors"
                        title="دەستکاریکرنا ناڤی"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        aria-label={`ژێبرنا بەشێ ${cat.name}`}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="ژێبرنا بەشی"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            هەمی گوهۆڕین راستەوخۆ دهێنە پاراستن.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            تەمام بوو
          </button>
        </div>
      </div>
    </div>
  );
};
