import { afterEach, describe, expect, it } from 'vitest';
import { validate } from 'class-validator';
import { UpdatePetDto } from './update-pet.dto.js';

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

describe('UpdatePetDto avatarUrl', () => {
  it('accepts a data image URI in development', async () => {
    process.env.NODE_ENV = 'development';
    const dto = Object.assign(new UpdatePetDto(), {
      avatarUrl: 'data:image/png;base64,iVBORw0KGgo=',
    });

    expect(await validate(dto)).toEqual([]);
  });

  it('rejects data image URIs in production', async () => {
    process.env.NODE_ENV = 'production';
    const dto = Object.assign(new UpdatePetDto(), {
      avatarUrl: 'data:image/png;base64,iVBORw0KGgo=',
    });

    expect((await validate(dto)).map(({ property }) => property)).toContain('avatarUrl');
  });

  it('continues to accept remote image URLs', async () => {
    process.env.NODE_ENV = 'production';
    const dto = Object.assign(new UpdatePetDto(), {
      avatarUrl: 'https://images.example.com/pet.png',
    });

    expect(await validate(dto)).toEqual([]);
  });

  it('rejects arbitrary strings', async () => {
    process.env.NODE_ENV = 'development';
    const dto = Object.assign(new UpdatePetDto(), { avatarUrl: 'not-an-image' });

    expect((await validate(dto)).map(({ property }) => property)).toContain('avatarUrl');
  });
});
