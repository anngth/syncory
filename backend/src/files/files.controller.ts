import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.filesService.uploadFile(file);
  }

  @Post('upload-multiple')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid files' })
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return this.filesService.uploadFiles(files);
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteFile(@Param('fileId') fileId: string) {
    await this.filesService.deleteFile(fileId);
    return { message: 'File deleted successfully' };
  }
}
