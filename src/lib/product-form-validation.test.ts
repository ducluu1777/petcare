import { describe, expect, it } from 'bun:test';
import { getProductFormError } from './product-form-validation';

const valid = {
  name: 'Lược chải lông', description: 'Lược dùng chải lông cho chó và mèo.',
  category: 'ACCESSORY', price: 85000, stock: 7, originalPrice: '',
};

describe('product form validation', () => {
  it('requires a meaningful description before sending to the API', () => {
    expect(getProductFormError({ ...valid, description: '' }, false)).toContain('mô tả');
    expect(getProductFormError({ ...valid, description: '   ' }, true)).toContain('mô tả');
  });
  it('rejects names containing only spaces', () => {
    expect(getProductFormError({ ...valid, name: '   ' }, false)).toContain('tên');
  });
  it('accepts a valid product with no optional list price', () => {
    expect(getProductFormError(valid, false)).toBeNull();
  });
  it('requires an explicitly selected category', () => {
    expect(getProductFormError({ ...valid, category: '' }, false)).toContain('danh mục');
  });
  it('rejects zero and fractional sale prices', () => {
    for (const price of [0, -1, 1.5]) expect(getProductFormError({ ...valid, price }, false)).toContain('giá bán');
  });
  it('requires opening stock for creation but allows zero', () => {
    expect(getProductFormError({ ...valid, stock: undefined }, false)).toContain('tồn kho');
    expect(getProductFormError({ ...valid, stock: 0 }, false)).toBeNull();
  });
  it('does not edit stock through the product edit form', () => {
    expect(getProductFormError({ ...valid, stock: undefined }, true)).toBeNull();
  });
  it('rejects invalid optional list prices', () => {
    for (const originalPrice of ['abc', '-1', '1.5']) {
      expect(getProductFormError({ ...valid, originalPrice }, false)).toContain('niêm yết');
    }
  });
});
