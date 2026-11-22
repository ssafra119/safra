import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reorderCategories,
  renameCategoryInProducts,
  handleCategoryDeletion,
} from './category.ts';
import type { Category, Product } from '../types.ts';

test('reorderCategories moves category up and down correctly', () => {
  const cats: Category[] = [
    { id: '1', name: 'شیرەمەنی' },
    { id: '2', name: 'سناکس' },
    { id: '3', name: 'پاقژکەر' },
  ];

  // Move snacks up from index 1 to index 0
  const movedUp = reorderCategories(cats, 1, 0);
  assert.equal(movedUp[0].name, 'سناکس');
  assert.equal(movedUp[1].name, 'شیرەمەنی');
  assert.equal(movedUp[2].name, 'پاقژکەر');

  // Move dairy down from index 0 to index 2
  const movedDown = reorderCategories(cats, 0, 2);
  assert.equal(movedDown[0].name, 'سناکس');
  assert.equal(movedDown[1].name, 'پاقژکەر');
  assert.equal(movedDown[2].name, 'شیرەمەنی');
});

test('renameCategoryInProducts updates all matching products', () => {
  const products: Product[] = [
    {
      id: 'p1',
      title: 'پەنیر',
      category: 'شیرەمەنی',
      images: [],
      piecesPerCarton: 12,
      piecePrice: 1000,
      cartonPrice: 12000,
      stockCartons: 10,
      stockPieces: 0,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'p2',
      title: 'چپس',
      category: 'سناکس',
      images: [],
      piecesPerCarton: 24,
      piecePrice: 500,
      cartonPrice: 12000,
      stockCartons: 5,
      stockPieces: 0,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const updated = renameCategoryInProducts(products, 'شیرەمەنی', 'شیرەمەنی و تەڕاتی');
  assert.equal(updated[0].category, 'شیرەمەنی و تەڕاتی');
  assert.equal(updated[1].category, 'سناکس');
});

test('handleCategoryDeletion reassigns deleted category products to fallback', () => {
  const products: Product[] = [
    {
      id: 'p1',
      title: 'پەنیر',
      category: 'شیرەمەنی',
      images: [],
      piecesPerCarton: 12,
      piecePrice: 1000,
      cartonPrice: 12000,
      stockCartons: 10,
      stockPieces: 0,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const updated = handleCategoryDeletion(products, 'شیرەمەنی', 'گشتی');
  assert.equal(updated[0].category, 'گشتی');
});
