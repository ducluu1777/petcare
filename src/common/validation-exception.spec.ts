import { describe, expect, it } from 'vitest';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { createValidationException } from './validation-exception.js';
import { CreatePetDto } from '../modules/pets/dto/create-pet.dto.js';
import { CreateOrderDto } from '../modules/orders/dto/create-order.dto.js';
import { ChangeStatusDto } from '../modules/bookings/dto/create-booking-v2.dto.js';
import { UpdateRoleDto } from '../modules/users/dto/update-role.dto.js';

function makePipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: createValidationException,
  });
}

describe('Enum validation messages shown in PetCare forms', () => {
  it.each([
    { metatype: CreatePetDto, payload: { name: 'Bông', species: 'DRAGON', breed: 'Poodle', weightKg: 5.1 }, expected: 'Loài thú cưng không hợp lệ. Vui lòng chọn lại.' },
    { metatype: UpdateRoleDto, payload: { role: 'ROOT' }, expected: 'Vai trò tài khoản không hợp lệ. Vui lòng chọn lại.' },
    { metatype: CreateOrderDto, payload: { paymentMethod: 'CARD', items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 1 }] }, expected: 'Phương thức thanh toán không hợp lệ. Vui lòng chọn lại.' },
    { metatype: ChangeStatusDto, payload: { fromStatus: 'STARTED', toStatus: 'DONE' }, expected: 'Trạng thái hiện tại không hợp lệ. Vui lòng chọn lại.' },
  ])('keeps HTTP 400 while explaining an invalid choice: $expected', async ({ metatype, payload, expected }) => {
    const error = await makePipe().transform(payload, { type: 'body', metatype }).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getStatus()).toBe(400);
    const messages = error.getResponse().message as string[];
    expect(messages).toContain(expected);
    expect(messages.join(' ')).not.toMatch(/DOG|CAT|ADMIN|STAFF|BANK_TRANSFER|BOOKED|STARTED/);
  });

  it('preserves valid enum values for business logic', async () => {
    const result = await makePipe().transform({ fromStatus: 'BOOKED', toStatus: 'ARRIVED' }, { type: 'body', metatype: ChangeStatusDto });
    expect(result).toMatchObject({ fromStatus: 'BOOKED', toStatus: 'ARRIVED' });
  });

  it('preserves custom messages and errors from nested fields', () => {
    const error = createValidationException([
      { property: 'species', constraints: { isEnum: 'Bạn chọn chó hoặc mèo nhé.' } },
      { property: 'items', children: [{ property: '0', children: [{ property: 'category', constraints: { isEnum: 'category must be one of the following values: FOOD, CARE' } }] }] },
      { property: 'email', constraints: { isEmail: 'Email chưa đúng định dạng.' } },
    ]);
    expect((error.getResponse() as { message: string[] }).message).toEqual([
      'Bạn chọn chó hoặc mèo nhé.',
      'Danh mục không hợp lệ. Vui lòng chọn lại.',
      'Email chưa đúng định dạng.',
    ]);
  });
});
