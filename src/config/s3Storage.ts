import multer from 'multer';
import multerS3 from 'multer-s3';
import { s3Client, S3_BUCKET, UPLOAD_CONFIG } from './aws';

// S3 storage configuration using AWS SDK v3
export const s3Storage = multerS3({
  s3: s3Client,
  bucket: S3_BUCKET,
  acl: 'public-read', // Make files publicly readable
  key: function (req, file, cb) {
    // Generate unique file names with folders
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    
    let folder = 'uploads/';
    
    // Organize files by type
    if (UPLOAD_CONFIG.ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      folder += 'videos/';
    } else if (UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      folder += 'images/';
    } else if (UPLOAD_CONFIG.ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      folder += 'documents/';
    } else {
      folder += 'others/';
    }
    
    // Add user ID if available
    const userId = (req as any).user?.id || 'anonymous';
    folder += `${userId}/`;
    
    const fileName = `${timestamp}-${randomString}-${file.originalname}`;
    cb(null, folder + fileName);
  },
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: function (req, file, cb) {
    cb(null, {
      uploadedBy: (req as any).user?.id || 'anonymous',
      uploadedAt: new Date().toISOString(),
      originalName: file.originalname
    });
  }
});

// File filter function
export const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    ...UPLOAD_CONFIG.ALLOWED_VIDEO_TYPES,
    ...UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES,
    ...UPLOAD_CONFIG.ALLOWED_DOCUMENT_TYPES
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
  }
};

// Create different upload configurations for different file types
export const createUploadConfig = (maxSize: number) => multer({
  storage: s3Storage,
  limits: {
    fileSize: maxSize,
  },
  fileFilter: fileFilter
});

// Export specific upload configurations
export const videoUpload = createUploadConfig(UPLOAD_CONFIG.MAX_FILE_SIZE);
export const imageUpload = createUploadConfig(UPLOAD_CONFIG.MAX_IMAGE_SIZE);
export const documentUpload = createUploadConfig(UPLOAD_CONFIG.MAX_DOCUMENT_SIZE);
export const generalUpload = createUploadConfig(UPLOAD_CONFIG.MAX_FILE_SIZE);
