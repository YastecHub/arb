import multer from 'multer';
import { badRequest } from '../utils/http';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(badRequest('Only PDF files are accepted'));
    }
    cb(null, true);
  },
}).single('document');

// PDFs held in memory, then pushed to object storage. 30 MB cap.
export const uploadPdf: import('express').RequestHandler = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return next(err);
    if (req.file && req.file.buffer.subarray(0, 1024).indexOf(Buffer.from('%PDF-')) < 0) {
      return next(badRequest('The uploaded file is not a valid PDF'));
    }
    next();
  });
};
