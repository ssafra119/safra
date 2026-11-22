import type { Category, Product } from '../types.ts';

/**
 * Reorders a category list by moving an item from one index to another.
 */
export function reorderCategories(
  categories: Category[],
  fromIndex: number,
  toIndex: number
): Category[] {
  if (
    fromIndex < 0 ||
    fromIndex >= categories.length ||
    toIndex < 0 ||
    toIndex >= categories.length ||
    fromIndex === toIndex
  ) {
    return categories;
  }

  const result = [...categories];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

/**
 * Updates products whose category matches oldName to newName when a category is renamed.
 */
export function renameCategoryInProducts(
  products: Product[],
  oldName: string,
  newName: string
): Product[] {
  const trimmedOld = oldName.trim();
  const trimmedNew = newName.trim();

  if (!trimmedOld || !trimmedNew || trimmedOld === trimmedNew) {
    return products;
  }

  return products.map((product) => {
    if (product.category === trimmedOld) {
      return {
        ...product,
        category: trimmedNew,
        updatedAt: new Date().toISOString(),
      };
    }
    return product;
  });
}

/**
 * Handles product category reassignment or fallback when a category is deleted.
 */
export function handleCategoryDeletion(
  products: Product[],
  deletedCategoryName: string,
  fallbackCategory = 'گشتی'
): Product[] {
  return products.map((p) => {
    if (p.category === deletedCategoryName) {
      return {
        ...p,
        category: fallbackCategory,
        updatedAt: new Date().toISOString(),
      };
    }
    return p;
  });
}
