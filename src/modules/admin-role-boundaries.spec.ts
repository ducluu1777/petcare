import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../common/decorators/auth.decorator.js';
import { UsersController } from './users/users.controller.js';
import { ServicesController } from './services/services.controller.js';
import { ProductsController } from './products/products.controller.js';
import { VouchersController } from './vouchers/vouchers.controller.js';
import { TimeSlotsController } from './time-slots/time-slots.controller.js';
import { AiAdminController } from './ai-assistant/ai-admin.controller.js';
import { DeliveryAreasController } from './orders/delivery-areas.controller.js';
import { BookingsController } from './bookings/bookings.controller.js';

function rolesFor(controller: Function, handler: string) {
  const method = (controller as { prototype: Record<string, object> }).prototype[handler];
  return Reflect.getMetadata(ROLES_KEY, method);
}

describe('Admin and Staff permission boundaries', () => {
  it('reserves account management and role changes for admins', () => {
    for (const handler of [
      'getStats',
      'findRecoverableCustomers',
      'updateRole',
      'adjustPoints',
      'adminUpdateProfile',
      'updateStatus',
      'updateCustomerProfile',
      'softDeleteUser',
      'restoreDeletedCustomer',
    ]) {
      expect(rolesFor(UsersController, handler), handler).toEqual([Role.ADMIN]);
    }
  });

  it('reserves service and voucher configuration for admins', () => {
    expect(rolesFor(ServicesController, 'findAllForAdmin')).toEqual([Role.ADMIN]);
    expect(rolesFor(ServicesController, 'create')).toEqual([Role.ADMIN]);
    expect(rolesFor(ServicesController, 'update')).toEqual([Role.ADMIN]);
    expect(rolesFor(ServicesController, 'remove')).toEqual([Role.ADMIN]);
    expect(rolesFor(ServicesController, 'setPriceTiers')).toEqual([Role.ADMIN]);
    expect(rolesFor(VouchersController, 'findAll')).toEqual([Role.ADMIN]);
    expect(rolesFor(VouchersController, 'create')).toEqual([Role.ADMIN]);
    expect(rolesFor(VouchersController, 'update')).toEqual([Role.ADMIN]);
  });

  it('keeps product catalog edits admin-only while allowing staff inventory operations', () => {
    for (const handler of ['create', 'update', 'remove']) {
      expect(rolesFor(ProductsController, handler), handler).toEqual([Role.ADMIN]);
    }
    expect(rolesFor(ProductsController, 'adjustStock')).toEqual([Role.STAFF, Role.ADMIN]);
  });

  it('allows staff to view schedule but reserves changes for admins', () => {
    expect(rolesFor(TimeSlotsController, 'findAdminRange')).toEqual([Role.STAFF, Role.ADMIN]);
    for (const handler of ['bulkCreate', 'update', 'remove']) {
      expect(rolesFor(TimeSlotsController, handler), handler).toEqual([Role.ADMIN]);
    }
    expect(rolesFor(BookingsController, 'getAdminScheduleSettings')).toEqual([Role.STAFF, Role.ADMIN]);
    expect(rolesFor(BookingsController, 'updateAdminScheduleSettings')).toEqual([Role.ADMIN]);
    expect(rolesFor(BookingsController, 'updateSpaBookingPromotion')).toEqual([Role.ADMIN]);
  });

  it('reserves AI configuration and delivery-area setup for admins', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AiAdminController)).toEqual([Role.ADMIN]);
    expect(rolesFor(DeliveryAreasController, 'listAll')).toEqual([Role.ADMIN]);
    expect(rolesFor(DeliveryAreasController, 'create')).toEqual([Role.ADMIN]);
    expect(rolesFor(DeliveryAreasController, 'update')).toEqual([Role.ADMIN]);
  });
});
