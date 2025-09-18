import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client with AWS SDK v3
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// S3 bucket configuration
export const S3_BUCKET = process.env.S3_BUCKET_NAME || 'thinkpro-lms-files';
export const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

// File upload configuration
export const UPLOAD_CONFIG = {
  // Increase file size limits for videos and documents
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB for videos
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB for images
  MAX_DOCUMENT_SIZE: 50 * 1024 * 1024, // 50MB for documents
  
  // Allowed file types
  ALLOWED_VIDEO_TYPES: [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/mov'
  ],
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
};

// Helper function to generate file URL
export const getFileUrl = (key: string): string => {
  if (CLOUDFRONT_DOMAIN) {
    return `https://${CLOUDFRONT_DOMAIN}/${key}`;
  }
  return `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
};

// Helper function to generate presigned URL for private files
export const generatePresignedUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn });
};
