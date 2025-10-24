import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { IFileUploadService, UploadResult } from '../interfaces/file-upload.interface';

@Injectable()
export class CloudinaryService implements IFileUploadService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async upload(file: Express.Multer.File, folder: string = 'syncory'): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
        },
        (error, result: UploadApiResponse) => {
          if (error) {
            this.logger.error(`Cloudinary upload error: ${error.message}`, error);
            return reject(error);
          }

          this.logger.log(`File uploaded to Cloudinary: ${result.public_id}`);

          const uploadResult: UploadResult = {
            fileId: result.public_id,
            fileName: file.originalname,
            fileUrl: result.secure_url,
            fileType: file.mimetype,
            fileSize: file.size,
            thumbnailUrl: result.thumbnail_url,
          };

          resolve(uploadResult);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async delete(fileId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(fileId);
      this.logger.log(`File deleted from Cloudinary: ${fileId}`);
    } catch (error) {
      this.logger.error(`Cloudinary delete error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUrl(fileId: string): Promise<string> {
    return cloudinary.url(fileId, { secure: true });
  }
}
