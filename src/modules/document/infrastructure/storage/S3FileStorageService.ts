import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IFileStorageService } from './FileStorageService';
import { AppError } from '../../../../shared/domain/errors/AppError';

export class S3FileStorageService implements IFileStorageService {
    private s3: S3Client;
    private bucket: string;

    constructor() {
        this.s3 = new S3Client({
            region: process.env.AWS_REGION || 'ap-south-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });
        this.bucket = process.env.AWS_BUCKET_NAME!;
    }

    async saveFile(workspaceId: string, documentId: string, file: Express.Multer.File): Promise<string> {
        const key = `${workspaceId}/${documentId}/${file.originalname}`;
        try {
            await this.s3.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            }));
            return key;  // store the S3 key as fileUrl in MongoDB
        } catch (error: any) {
            throw new AppError(`Failed to upload file to S3: ${error.message}`, 500);
        }
    }

    getFileUrl(workspaceId: string, documentId: string, fileName: string): string {
        return `${workspaceId}/${documentId}/${fileName}`;
    }

    async deleteFile(fileUrl: string): Promise<void> {
        try {
            await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: fileUrl }));
        } catch (error) {
            console.error(`Failed to delete S3 object ${fileUrl}:`, error);
        }
    }

    getLocalPath(_fileUrl: string): string {
        return '';  // not applicable for S3
    }

    async getPresignedUrl(fileUrl: string): Promise<string> {
        const command = new GetObjectCommand({ Bucket: this.bucket, Key: fileUrl });
        return getSignedUrl(this.s3, command, { expiresIn: 900 });  // 15 min
    }
}
