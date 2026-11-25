import { describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import { BookingsService } from './bookings.service.js';
import { bookingQuoteFingerprint } from './booking-confirmation.js';

describe('confirmed chat bookings', () => {
  it('returns the persisted booking on replay without creating, notifying or emailing again', async () => {
    const existing = { id: 'booking', code: 'BK-TEST', customerId: 'owner', customer: { email: 'qa@example.invalid' } };
    const tx = { booking: { findUnique: vi.fn().mockResolvedValue(existing), create: vi.fn() }, $executeRaw: vi.fn(), petProfile: { findUnique: vi.fn() } };
    const mail = { sendBusinessNotificationEmail: vi.fn() };
    const service = new BookingsService({ $transaction: (callback: (client: unknown) => unknown) => callback(tx) } as any, {} as any, mail as any);
    const result = await (service.bookAppointmentTx as any)({ userId: 'owner', role: Role.CUSTOMER }, { petId: 'pet', serviceIds: ['spa'], startAt: '2026-10-22T10:00:00+07:00' }, undefined, { id: 'quote-id', expectedState: 'hash' });
    expect(result).toEqual(existing);
    expect(tx.petProfile.findUnique).not.toHaveBeenCalled();
    expect(tx.booking.create).not.toHaveBeenCalled();
    expect(mail.sendBusinessNotificationEmail).not.toHaveBeenCalled();
  });

  it('never returns a persisted confirmation belonging to another customer', async () => {
    const tx = { booking: { findUnique: vi.fn().mockResolvedValue({ customerId: 'other' }) }, $executeRaw: vi.fn() };
    const service = new BookingsService({ $transaction: (callback: (client: unknown) => unknown) => callback(tx) } as any, {} as any);
    await expect((service.bookAppointmentTx as any)({ userId: 'owner', role: Role.CUSTOMER }, { petId: 'pet', serviceIds: ['spa'] }, undefined, { id: 'quote-id', expectedState: 'hash' })).rejects.toThrow('không thuộc');
  });

  it('changes the snapshot if weight, service or price changes', () => {
    const pet = { id: 'pet', name: 'Bông', species: 'CAT', weightKg: 3.2 };
    const services = [{ id: 'spa', name: 'Spa mèo', category: 'CAT_SPA', isAddon: false }];
    const original = bookingQuoteFingerprint(pet, services, new Map([['spa', 220000]]));
    expect(bookingQuoteFingerprint({ ...pet, weightKg: 5 }, services, new Map([['spa', 220000]]))).not.toBe(original);
    expect(bookingQuoteFingerprint(pet, services, new Map([['spa', 300000]]))).not.toBe(original);
  });
});
