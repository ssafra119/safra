import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatStockStatus,
  formatPrice,
  calculateCartonPrice,
  validateProduct,
  filterProducts,
  normalizeEnglishDigits,
  parseFlexibleNumber,
} from './stock.ts';
import type { Product } from '../types.ts';

test('formatStockStatus identifies out of stock when cartons and pieces are 0', () => {
  const result = formatStockStatus(0, 0);
  assert.equal(result.isOutOfStock, true);
  assert.equal(result.label, '⚠️ نە مایە (خلاس)');
});

test('formatStockStatus formats remaining amount in English numbers when stock is positive', () => {
  const result = formatStockStatus(14, 5);
  assert.equal(result.isOutOfStock, false);
  assert.equal(result.label, 'ماینە: 14 کارتون و 5 دانە');

  // Verify only standard English digits are in the label
  const matches = result.label.match(/\d+/g);
  assert.deepEqual(matches, ['14', '5']);
});

test('formatStockStatus handles pieces remaining even if cartons is 0', () => {
  const result = formatStockStatus(0, 8);
  assert.equal(result.isOutOfStock, false);
  assert.equal(result.label, 'ماینە: 0 کارتون و 8 دانە');
});

test('formatPrice formats amount with English comma separation and currency suffix', () => {
  assert.equal(formatPrice(1500), '1,500 د.ع');
  assert.equal(formatPrice(2400), '2,400 د.ع');
  assert.equal(formatPrice(1100), '1,100 د.ع');
  assert.equal(formatPrice(36000), '36,000 د.ع');
  assert.equal(formatPrice(0), '0 د.ع');
});

test('calculateCartonPrice computes piecePrice times piecesPerCarton', () => {
  assert.equal(calculateCartonPrice(1500, 24), 36000);
  assert.equal(calculateCartonPrice(750, 12), 9000);
});

test('normalizeEnglishDigits and parseFlexibleNumber handle arbitrary prices and Kurdish/Arabic numerals', () => {
  assert.equal(normalizeEnglishDigits('٢٤٠٠'), '2400');
  assert.equal(normalizeEnglishDigits('۱۱۰۰'), '1100');
  assert.equal(parseFlexibleNumber('2400'), 2400);
  assert.equal(parseFlexibleNumber('1100'), 1100);
  assert.equal(parseFlexibleNumber('٢٤٠٠'), 2400);
  assert.ok(Number.isNaN(parseFlexibleNumber('')));
});

test('validateProduct validates required product fields and accepts any arbitrary non-negative price', () => {
  const invalid = validateProduct({});
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length >= 3);

  const nanInvalid = validateProduct({
    title: 'تێست',
    category: 'شیرەمەنی',
    piecesPerCarton: 12,
    piecePrice: Number.NaN,
    cartonPrice: 2400,
    stockCartons: 5,
    stockPieces: 0,
  });
  assert.equal(nanInvalid.valid, false);

  const valid = validateProduct({
    title: 'شیرێ کالیفۆرنیا 1 لیتر',
    category: 'شیرەمەنی',
    piecesPerCarton: 12,
    piecePrice: 1100,
    cartonPrice: 2400,
    stockCartons: 50,
    stockPieces: 4,
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});

test('filterProducts filters correctly by search query and category', () => {
  const mockProducts: Product[] = [
    {
      id: '1',
      title: 'پەنیرێ سەفرا 500 گرام',
      category: 'شیرەمەنی',
      images: [],
      piecesPerCarton: 24,
      piecePrice: 2000,
      cartonPrice: 48000,
      stockCartons: 10,
      stockPieces: 0,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '2',
      title: 'چپسێ سەفرا تامی پەنیر',
      category: 'سناکس',
      images: [],
      piecesPerCarton: 40,
      piecePrice: 500,
      cartonPrice: 20000,
      stockCartons: 25,
      stockPieces: 2,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '3',
      title: 'مایتایێت زاهی سەفرا 1 لیتر',
      category: 'پاقژکەر',
      images: [],
      piecesPerCarton: 12,
      piecePrice: 1750,
      cartonPrice: 21000,
      stockCartons: 0,
      stockPieces: 0,
      createdAt: '',
      updatedAt: '',
    },
  ];

  // Search by query
  const queryResult = filterProducts(mockProducts, 'پەنیر', 'all');
  assert.equal(queryResult.length, 2); // cheese and cheese flavored chips

  // Filter by category
  const categoryResult = filterProducts(mockProducts, '', 'پاقژکەر');
  assert.equal(categoryResult.length, 1);
  assert.equal(categoryResult[0].title, 'مایتایێت زاهی سەفرا 1 لیتر');

  // Filter by both
  const combined = filterProducts(mockProducts, 'سەفرا', 'سناکس');
  assert.equal(combined.length, 1);
  assert.equal(combined[0].id, '2');
});
