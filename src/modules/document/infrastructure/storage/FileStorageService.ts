import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { AppError } from '../../../../shared/domain/errors/AppError';

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const writeFile = promisify(fs.writeFile);

/**
 * File Storage Service Interface
 */
export interface IFileStorageService {
    saveFile(workspaceId: string, documentId: string, file: Express.Multer.File): Promise<string>;
    getFileUrl(workspaceId: string, documentId: string, fileName: string): string;
    deleteFile(fileUrl: string): Promise<void>;
    getLocalPath(fileUrl: string): string;
}

/**
 * Local File Storage Service Implementation
 * 
 * Stores files in local filesystem with S3-compatible URL format:
 * - Local: file:///uploads/{workspaceId}/{documentId}/{filename}
 * - Future S3: https://s3.amazonaws.com/bucket/...
 */
export class LocalFileStorageService implements IFileStorageService {
    private uploadDir: string;

    constructor(uploadDir: string = './uploads') {
        this.uploadDir = uploadDir;
    }

    /**
     * Save file to local storage
     * @returns File URL in S3-compatible format
     */
    async saveFile(
        workspaceId: string,
        documentId: string,
        file: Express.Multer.File
    ): Promise<string> {
        try {
            // Create directory structure: /uploads/{workspaceId}/{documentId}/
            const dirPath = path.join(this.uploadDir, workspaceId, documentId);
            await mkdir(dirPath, { recursive: true });

            // Save file
            const filePath = path.join(dirPath, file.originalname);
            await writeFile(filePath, file.buffer);

            // Return S3-compatible URL format
            return this.getFileUrl(workspaceId, documentId, file.originalname);
        } catch (error: any) {
            throw new AppError(`Failed to save file: ${error.message}`, 500);
        }
    }

    /**
     * Generate file URL (S3-compatible format)
     */
    getFileUrl(workspaceId: string, documentId: string, fileName: string): string {
        // Return file:// URL for local storage (can be replaced with https://s3... later)
        return `file:///${this.uploadDir}/${workspaceId}/${documentId}/${fileName}`;
    }

    /**
     * Delete file from storage
     */
    async deleteFile(fileUrl: string): Promise<void> {
        try {
            const localPath = this.getLocalPath(fileUrl);

            // Check if file exists before deleting
            if (fs.existsSync(localPath)) {
                await unlink(localPath);
            }
        } catch (error) {
            // Log error but don't throw - file deletion is not critical
            console.error(`Failed to delete file ${fileUrl}:`, error);
        }
    }

    /**
     * Convert file URL to local filesystem path
     */
    getLocalPath(fileUrl: string): string {
        // Remove file:/// prefix
        return fileUrl.replace('file:///', '');
    }
}
