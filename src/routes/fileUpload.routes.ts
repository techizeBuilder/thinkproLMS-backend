import { Router } from 'express';
import { 
  uploadVideo, 
  uploadImage, 
  uploadDocument, 
  directUpload,
  deleteFile, 
  getFileMetadata,
  uploadMultiple
} from '../controllers/fileUploadController';
import { 
  videoUpload, 
  imageUpload, 
  documentUpload,
  generalUpload
} from '../config/s3Storage';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Single file upload routes
router.post('/video', videoUpload.single('video'), uploadVideo);
router.post('/image', imageUpload.single('image'), uploadImage);
router.post('/document', documentUpload.single('document'), uploadDocument);

// Multiple file upload
router.post('/multiple', generalUpload.array('files', 10), uploadMultiple);

// Direct upload (presigned URL approach)
router.post('/direct', directUpload);

// File management routes
router.delete('/:s3Key', deleteFile);
router.get('/metadata/:s3Key', getFileMetadata);

export default router;
