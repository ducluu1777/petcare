import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateProductDto } from './create-product.dto.js';
import { UpdateProductDto } from './update-product.dto.js';

describe('product sale price validation', () => {
  it('rejects a zero sale price when creating a product', async () => {
    const dto = Object.assign(new CreateProductDto(), { price: 0 });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'price')).toMatchObject({
      constraints: expect.objectContaining({ min: expect.any(String) }),
    });
  });

  it('rejects a zero sale price when updating a product', async () => {
    const dto = Object.assign(new UpdateProductDto(), { price: 0 });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'price')).toMatchObject({
      constraints: expect.objectContaining({ min: expect.any(String) }),
    });
  });
});
