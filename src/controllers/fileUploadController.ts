import { Request, Response } from 'express';
import { 
  s3Client, 
  S3_BUCKET, 
  getFileUrl, 
  generatePresignedUrl 
} from '../config/aws';
import { 
  PutObjectCommand, 
  DeleteObjectCommand, 
  HeadObjectCommand 
} from '@aws-sdk/client-s3';
import { videoUpload, imageUpload, documentUpload, generalUpload } from '../config/s3Storage';

// Upload video files
export const uploadVideo = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided'
      });
    }

    const fileUrl = getFileUrl(req.file.key);

    res.json({
      success: true,
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        s3Key: req.file.key
      }
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload video'
    });
  }
};

// Upload image files
export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const fileUrl = getFileUrl(req.file.key);

    res.json({
      success: true,
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        s3Key: req.file.key
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
};

// Upload document files
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No document file provided'
      });
    }

    const fileUrl = getFileUrl(req.file.key);

    res.json({
      success: true,
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        s3Key: req.file.key
      }
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document'
    });
  }
};

// Direct upload to S3 (alternative approach like in the image)
export const directUpload = async (req: Request, res: Response) => {
  try {
    const { fileName, fileType, fileSize } = req.body;
    
    if (!fileName || !fileType) {
      return res.status(400).json({
        success: false,
        message: 'File name and type are required'
      });
    }

    // Generate unique key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const userId = (req as any).user?.id || 'anonymous';
    const key = `uploads/direct/${userId}/${timestamp}-${randomString}-${fileName}`;

    // Generate presigned URL for direct upload
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: fileType,
      Metadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        originalName: fileName
      }
    });

    const presignedUrl = await generatePresignedUrl(key, 3600); // 1 hour expiry

    res.json({
      success: true,
      data: {
        presignedUrl,
        key,
        fileUrl: getFileUrl(key)
      }
    });
  } catch (error) {
    console.error('Direct upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate upload URL'
    });
  }
};

// Delete file from S3
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { s3Key } = req.params;

    if (!s3Key) {
      return res.status(400).json({
        success: false,
        message: 'S3 key is required'
      });
    }

    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key
    });

    await s3Client.send(command);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
};

// Get file metadata
export const getFileMetadata = async (req: Request, res: Response) => {
  try {
    const { s3Key } = req.params;

    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key
    });

    const metadata = await s3Client.send(command);

    res.json({
      success: true,
      data: {
        contentType: metadata.ContentType,
        contentLength: metadata.ContentLength,
        lastModified: metadata.LastModified,
        metadata: metadata.Metadata
      }
    });
  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file metadata'
    });
  }
};

// Upload multiple files
export const uploadMultiple = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      });
    }

    const uploadedFiles = files.map(file => ({
      fileUrl: getFileUrl(file.key),
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      s3Key: file.key
    }));

    res.json({
      success: true,
      data: {
        files: uploadedFiles,
        count: uploadedFiles.length
      }
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload files'
    });
  }
};
