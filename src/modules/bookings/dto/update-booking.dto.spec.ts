import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateBookingAddonsDto } from './update-booking.dto.js';

describe('UpdateBookingAddonsDto', () => {
  it('accepts a remove-only request without requiring addServiceIds', async () => {
    const dto = plainToInstance(UpdateBookingAddonsDto, {
      removeBookingServiceIds: ['67d3b1c2-12c9-4d8c-a1d2-123456789abc'],
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts an add-only request without requiring removeBookingServiceIds', async () => {
    const dto = plainToInstance(UpdateBookingAddonsDto, {
      addServiceIds: ['67d3b1c2-12c9-4d8c-a1d2-123456789abc'],
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects malformed service and booking-service IDs', async () => {
    const dto = plainToInstance(UpdateBookingAddonsDto, {
      addServiceIds: ['not-a-uuid'],
      removeBookingServiceIds: ['also-not-a-uuid'],
    });

    const errors = await validate(dto);
    expect(errors.map(({ property }) => property).sort()).toEqual([
      'addServiceIds',
      'removeBookingServiceIds',
    ]);
  });
});
