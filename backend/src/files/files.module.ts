import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { S3Service } from './services/s3.service';
import { CloudinaryService } from './services/cloudinary.service';
import { LocalStorageService } from './services/local-storage.service';
import { FileUploadFactory } from './services/file-upload.factory';

@Module({
  imports: [ConfigModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    S3Service,
    CloudinaryService,
    LocalStorageService,
    FileUploadFactory,
  ],
  exports: [FilesService],
})
export class FilesModule {}
