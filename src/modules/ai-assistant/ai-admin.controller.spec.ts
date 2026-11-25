import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/auth.decorator.js';
import { AiAdminController } from './ai-admin.controller.js';

describe('AiAdminController', () => {
  it('reserves AI settings and knowledge management for admins', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AiAdminController)).toEqual([Role.ADMIN]);
  });

  it('passes the selected usage window to the overview service', async () => {
    const aiAdminService = { getOverview: vi.fn().mockResolvedValue({}) };
    const controller = new AiAdminController(aiAdminService as never);

    await controller.getOverview('30');

    expect(aiAdminService.getOverview).toHaveBeenCalledWith(30);
  });
});
