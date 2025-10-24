import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IFileUploadService } from '../interfaces/file-upload.interface';
import { S3Service } from './s3.service';
import { CloudinaryService } from './cloudinary.service';
import { LocalStorageService } from './local-storage.service';

@Injectable()
export class FileUploadFactory {
  private readonly logger = new Logger(FileUploadFactory.name);

  constructor(
    private configService: ConfigService,
    private s3Service: S3Service,
    private cloudinaryService: CloudinaryService,
    private localStorageService: LocalStorageService,
  ) {}

  getUploadService(): IFileUploadService {
    const provider = this.configService.get<string>('FILE_UPLOAD_PROVIDER', 'local');

    switch (provider) {
      case 's3':
        this.logger.log('Using AWS S3 for file uploads');
        return this.s3Service;
      case 'cloudinary':
        this.logger.log('Using Cloudinary for file uploads');
        return this.cloudinaryService;
      case 'local':
      default:
        this.logger.log('Using local storage for file uploads');
        return this.localStorageService;
    }
  }
}
