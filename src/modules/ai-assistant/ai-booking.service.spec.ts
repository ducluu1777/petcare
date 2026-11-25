import { describe, expect, it, vi } from 'vitest';
import { AiBookingService } from './ai-booking.service.js';

function fixture() {
  const pet = { id: 'pet', userId: 'owner', name: 'Bông', species: 'CAT', weightKg: 3.2, archivedAt: null };
  const spa = { id: 'spa', name: 'Spa mèo', category: 'CAT_SPA', isAddon: false, isActive: true, priceTiers: [] };
  const prisma = { user: { findFirst: vi.fn().mockResolvedValue({ id: 'owner' }) }, petProfile: { findFirst: vi.fn().mockResolvedValue(pet), findMany: vi.fn().mockResolvedValue([pet]) } };
  const services = { findAll: vi.fn().mockResolvedValue([spa]), calculatePrice: vi.fn().mockResolvedValue({ priceApplied: 220000 }) };
  const bookings = { getAvailableSlots: vi.fn().mockResolvedValue({ slots: [{ time: '10:00', available: true, remaining: 1 }] }), bookAppointmentTx: vi.fn().mockResolvedValue({ id: 'book', code: 'BK-TEST', total: 220000, startAt: '2026-10-22T03:00:00Z' }) };
  const service = new AiBookingService(prisma as any, services as any, bookings as any, { get: () => 'secret' } as any);
  return { service, prisma, services, bookings };
}

describe('booking inside chat', () => {
  const input = { petId: 'pet', serviceIds: ['spa'], startAt: '2026-10-22T10:00:00+07:00' };
  it('prepares a review without writing and only confirms a signed owner-bound quote', async () => {
    const { service, bookings } = fixture();
    const quote = await service.prepare('owner', input);
    expect(quote.total).toBe(220000);
    expect(quote.pet.name).toBe('Bông');
    expect(bookings.bookAppointmentTx).not.toHaveBeenCalled();
    await service.confirm('owner', quote.token);
    expect(bookings.bookAppointmentTx.mock.calls[0][0]).toEqual({ userId: 'owner', role: 'CUSTOMER' });
    expect(bookings.bookAppointmentTx.mock.calls[0][1]).toEqual(input);
    expect(bookings.bookAppointmentTx.mock.calls[0][3]).toHaveProperty('expectedState');
    await expect(service.confirm('other', quote.token)).rejects.toThrow();
  });
  it('rejects unavailable slots, unknown/archived pets and add-ons without a main service', async () => {
    const { service, prisma, services, bookings } = fixture();
    bookings.getAvailableSlots.mockResolvedValueOnce({ slots: [] });
    await expect(service.prepare('owner', input)).rejects.toThrow('hết chỗ');
    prisma.petProfile.findFirst.mockResolvedValueOnce(null);
    await expect(service.prepare('owner', input)).rejects.toThrow('hồ sơ');
    services.findAll.mockResolvedValueOnce([{ id: 'spa', name: 'Móng', category: 'BATH', isAddon: true }]);
    await expect(service.prepare('owner', input)).rejects.toThrow('một dịch vụ chính');
    expect(bookings.bookAppointmentTx).not.toHaveBeenCalled();
  });
  it('rejects disabled customers before exposing pet details or writing', async () => {
    const { service, prisma } = fixture();
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.options('owner')).rejects.toThrow('không hoạt động');
    expect(prisma.petProfile.findMany).not.toHaveBeenCalled();
  });
});
