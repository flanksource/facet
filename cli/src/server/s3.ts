import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { S3Config } from './config.js';
import { RenderError } from './errors.js';

export class S3Uploader {
  private client: S3Client;

  constructor(private config: S3Config) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async upload(key: string, body: Buffer | string, contentType: string): Promise<string> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Body: typeof body === 'string' ? Buffer.from(body) : body,
          ContentType: contentType,
        }),
      );
      return `${this.config.endpoint}/${this.config.bucket}/${key}`;
    } catch (err) {
      throw new RenderError(
        'S3_UPLOAD_FAILED',
        `S3 upload failed: ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  async presignedUrl(key: string): Promise<string> {
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
        { expiresIn: this.config.presignExpiry },
      );
    } catch (err) {
      throw new RenderError(
        'S3_UPLOAD_FAILED',
        `Presign failed: ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  generateKey(templateName: string, extension: string): string {
    const timestamp = Date.now();
    const shortId = Math.random().toString(36).slice(2, 8);
    const prefix = this.config.prefix ? `${this.config.prefix}/` : '';
    return `${prefix}${templateName}/${timestamp}-${shortId}.${extension}`;
  }
}
