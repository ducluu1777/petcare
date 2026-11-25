import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import 'multer';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string; publicId: string }> {
    if (!file) {
      throw new BadRequestException('Không tìm thấy file tải lên');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Chỉ cho phép tải lên hình ảnh');
    }

    // 5MB limit check (Multer should also handle this, but double check)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Kích thước file không được vượt quá 5MB');
    }

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    if (!cloudName) {
      this.logger.warn('Cloudinary chưa được cấu hình, lưu trữ ảnh dưới dạng Data URI trong môi trường phát triển');
      const base64 = file.buffer.toString('base64');
      return {
        url: `data:${file.mimetype};base64,${base64}`,
        publicId: `dev-upload-${Date.now()}`,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'petcare' },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error('Lỗi upload Cloudinary', error);
            return reject(new InternalServerErrorException('Lỗi tải ảnh lên máy chủ'));
          }
          if (!result) {
            return reject(new InternalServerErrorException('Không nhận được phản hồi từ máy chủ ảnh'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}
