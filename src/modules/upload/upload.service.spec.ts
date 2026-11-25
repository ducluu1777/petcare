import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { v2 as cloudinary } from 'cloudinary';
import { vi } from 'vitest';
import { UploadService } from './upload.service.js';

vi.mock('cloudinary', () => {
  return {
    v2: {
      config: vi.fn(),
      uploader: {
        upload_stream: vi.fn(),
      },
    },
  };
});

describe('UploadService', () => {
  let service: UploadService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: vi.fn().mockReturnValue('mock-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadImage', () => {
    it('should throw BadRequestException if no file provided', async () => {
      await expect(service.uploadImage(undefined as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if not image', async () => {
      const file = { mimetype: 'application/pdf', size: 1000 } as Express.Multer.File;
      await expect(service.uploadImage(file)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file > 5MB', async () => {
      const file = { mimetype: 'image/jpeg', size: 6 * 1024 * 1024 } as Express.Multer.File;
      await expect(service.uploadImage(file)).rejects.toThrow(BadRequestException);
    });

    it('should return url and publicId on success', async () => {
      const file = { mimetype: 'image/jpeg', size: 1000, buffer: Buffer.from('test') } as Express.Multer.File;
      
      const uploadStreamMock = vi.mocked(cloudinary.uploader.upload_stream);
      uploadStreamMock.mockImplementation((options, callback) => {
        if (callback) {
          callback(undefined, { secure_url: 'http://test.com/img.jpg', public_id: 'img123' } as any);
        }
        return { end: vi.fn() } as any;
      });

      const result = await service.uploadImage(file);
      expect(result).toEqual({ url: 'http://test.com/img.jpg', publicId: 'img123' });
    });

    it('should throw InternalServerErrorException on cloudinary error', async () => {
      const file = { mimetype: 'image/jpeg', size: 1000, buffer: Buffer.from('test') } as Express.Multer.File;
      
      const uploadStreamMock = vi.mocked(cloudinary.uploader.upload_stream);
      uploadStreamMock.mockImplementation((options, callback) => {
        if (callback) {
          callback(new Error('Cloudinary error'), undefined);
        }
        return { end: vi.fn() } as any;
      });

      await expect(service.uploadImage(file)).rejects.toThrow(InternalServerErrorException);
    });
  });
});
