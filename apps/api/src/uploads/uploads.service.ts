import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, join, resolve } from 'path';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const UPLOADS_URL_PREFIX = '/uploads/';

/** Detects the real image type from the file's first bytes, so a renamed file can't sneak through. */
function detectImageType(buffer: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/**
 * Stores uploaded images on local disk and returns their public path (e.g. /uploads/abc.jpg).
 * Swap this for S3 or similar storage in production; callers only see the returned URL.
 */
@Injectable()
export class UploadsService {
  readonly dir: string;

  constructor(config: ConfigService) {
    this.dir = resolve(config.get<string>('UPLOAD_DIR', 'uploads'));
  }

  async saveImage(file: { buffer: Buffer; size: number } | undefined): Promise<string> {
    if (!file) throw new BadRequestException('Choose an image to upload');
    if (file.size > MAX_IMAGE_BYTES) throw new BadRequestException('Images must be 5 MB or smaller');
    const type = detectImageType(file.buffer);
    if (!type) throw new BadRequestException('Only JPG, PNG and WebP images are allowed');

    await mkdir(this.dir, { recursive: true });
    const name = `${randomUUID()}.${type}`;
    await writeFile(join(this.dir, name), file.buffer);
    return UPLOADS_URL_PREFIX + name;
  }

  /** Deletes a file previously returned by saveImage. Ignores anything else. */
  async remove(url: string | null | undefined): Promise<void> {
    if (!url?.startsWith(UPLOADS_URL_PREFIX)) return;
    await unlink(join(this.dir, basename(url))).catch(() => undefined);
  }
}
