import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IFileUploadService, UploadResult } from '../interfaces/file-upload.interface';

@Injectable()
export class LocalStorageService implements IFileUploadService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, folder: string = 'general'): Promise<UploadResult> {
    const folderPath = path.join(this.uploadDir, folder);

    // Create folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const fileId = `${uuidv4()}-${file.originalname}`;
    const filePath = path.join(folderPath, fileId);

    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);

    const fileUrl = `${this.baseUrl}/uploads/${folder}/${fileId}`;

    this.logger.log(`File uploaded locally: ${filePath}`);

    return {
      fileId: `${folder}/${fileId}`,
      fileName: file.originalname,
      fileUrl,
      fileType: file.mimetype,
      fileSize: file.size,
    };
  }

  async delete(fileId: string): Promise<void> {
    const filePath = path.join(this.uploadDir, fileId);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`File deleted locally: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Local delete error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUrl(fileId: string): Promise<string> {
    return `${this.baseUrl}/uploads/${fileId}`;
  }
}
