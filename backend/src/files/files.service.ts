import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileUploadFactory } from './services/file-upload.factory';
import { UploadResult } from './interfaces/file-upload.interface';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    private fileUploadFactory: FileUploadFactory,
    private configService: ConfigService,
  ) {
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 10485760); // 10MB
    this.allowedMimeTypes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Text
      'text/plain',
      'text/csv',
      // Archives
      'application/zip',
      'application/x-rar-compressed',
      // Code
      'text/javascript',
      'application/json',
      'text/html',
      'text/css',
      // Video
      'video/mp4',
      'video/mpeg',
      'video/webm',
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/webm',
    ];
  }

  async uploadFile(file: Express.Multer.File, folder?: string): Promise<UploadResult> {
    // Validate file
    this.validateFile(file);

    const uploadService = this.fileUploadFactory.getUploadService();
    const result = await uploadService.upload(file, folder);

    this.logger.log(`File uploaded: ${result.fileName} (${result.fileId})`);

    return result;
  }

  async uploadFiles(files: Express.Multer.File[], folder?: string): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteFile(fileId: string): Promise<void> {
    const uploadService = this.fileUploadFactory.getUploadService();
    await uploadService.delete(fileId);

    this.logger.log(`File deleted: ${fileId}`);
  }

  async getFileUrl(fileId: string): Promise<string> {
    const uploadService = this.fileUploadFactory.getUploadService();
    return uploadService.getUrl(fileId);
  }

  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Check mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
  }

  getFileType(mimetype: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (
      mimetype.includes('pdf') ||
      mimetype.includes('document') ||
      mimetype.includes('sheet') ||
      mimetype.includes('presentation') ||
      mimetype.includes('text')
    ) {
      return 'document';
    }
    return 'other';
  }
}
