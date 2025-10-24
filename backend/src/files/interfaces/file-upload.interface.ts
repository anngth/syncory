export interface UploadResult {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string;
}

export interface IFileUploadService {
  upload(file: Express.Multer.File, folder?: string): Promise<UploadResult>;
  delete(fileId: string): Promise<void>;
  getUrl(fileId: string): Promise<string>;
}
