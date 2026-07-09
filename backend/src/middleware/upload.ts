import multer from 'multer';
import { badRequest } from '../utils/http';

// PDFs held in memory, then pushed to object storage. 30 MB cap.
export const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(badRequest('Only PDF files are accepted'));
    }
    cb(null, true);
  },
}).single('document');
