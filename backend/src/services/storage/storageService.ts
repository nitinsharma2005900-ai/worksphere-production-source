import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';

interface UploadFileOptions {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  organizationId: string;
}

interface StoredFile {
  storageKey: string;
  storageUrl: string;
}

const getLocalBaseDir = () => path.resolve(process.cwd(), 'uploads');

const sanitizeFileName = (fileName: string) =>
  path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');

export const storageService = {
  async uploadFile(options: UploadFileOptions): Promise<StoredFile> {
    if (env.STORAGE_MODE === 's3') {
      throw new Error('S3 storage is not configured in this local build');
    }

    const baseDir = getLocalBaseDir();
    const storageKey = `${options.organizationId}/${uuidv4()}-${sanitizeFileName(options.fileName)}`;
    const filePath = path.join(baseDir, storageKey);

    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, options.buffer);

    return {
      storageKey,
      storageUrl: `/api/v1/attachments/download/${encodeURIComponent(storageKey)}`
    };
  }
};
