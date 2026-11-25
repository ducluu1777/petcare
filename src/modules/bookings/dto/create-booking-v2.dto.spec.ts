import { plainToInstance } from 'class-transformer';
import { describe, expect, it } from 'vitest';

import { QueryAvailableSlotsDto } from './create-booking-v2.dto.js';

describe('QueryAvailableSlotsDto', () => {
  it('normalizes the comma-separated service IDs sent by the booking page', () => {
    const dto = plainToInstance(QueryAvailableSlotsDto, {
      date: '2026-10-20',
      serviceIds: 'spa-1,addon-2',
    });

    expect(dto.serviceIds).toEqual(['spa-1', 'addon-2']);
  });

  it('accepts repeated service IDs and trims empty whitespace', () => {
    const dto = plainToInstance(QueryAvailableSlotsDto, {
      date: '2026-10-20',
      serviceIds: ['spa-1', ' addon-2 '],
    });

    expect(dto.serviceIds).toEqual(['spa-1', 'addon-2']);
  });
});
