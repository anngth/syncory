import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { IFileUploadService, UploadResult } from '../interfaces/file-upload.interface';

@Injectable()
export class S3Service implements IFileUploadService {
  private readonly logger = new Logger(S3Service.name);
  private s3: AWS.S3;
  private bucket: string;
  private region: string;

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET');
    this.region = this.configService.get<string>('AWS_S3_REGION', 'us-east-1');

    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      region: this.region,
    });
  }

  async upload(file: Express.Multer.File, folder: string = 'uploads'): Promise<UploadResult> {
    const fileId = `${folder}/${uuidv4()}-${file.originalname}`;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.bucket,
      Key: fileId,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };

    try {
      await this.s3.upload(params).promise();

      const fileUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileId}`;

      this.logger.log(`File uploaded to S3: ${fileId}`);

      return {
        fileId,
        fileName: file.originalname,
        fileUrl,
        fileType: file.mimetype,
        fileSize: file.size,
      };
    } catch (error) {
      this.logger.error(`S3 upload error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(fileId: string): Promise<void> {
    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: this.bucket,
      Key: fileId,
    };

    try {
      await this.s3.deleteObject(params).promise();
      this.logger.log(`File deleted from S3: ${fileId}`);
    } catch (error) {
      this.logger.error(`S3 delete error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUrl(fileId: string): Promise<string> {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileId}`;
  }
}
