import multer from 'multer';
import path from 'path';

import { env } from '../../config/env';
import {
  ALLOWED_IMAGE_UPLOAD_EXTENSIONS,
  ALLOWED_IMAGE_UPLOAD_MIME_TYPES,
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
} from '../constants/upload.constants';
import { AppError } from '../errors/app.error';

const createUploadMiddleware = (
  allowedMimeTypes: readonly string[],
  allowedExtensions: readonly string[],
  errorMessage: string,
) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: env.uploads.maxFileSizeMb * 1024 * 1024,
    },
    fileFilter: (_request, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const mimeTypeAllowed = allowedMimeTypes.includes(file.mimetype);
      const extensionAllowed = allowedExtensions.includes(extension);

      if (mimeTypeAllowed && extensionAllowed) {
        callback(null, true);
        return;
      }

      callback(new AppError(400, 'INVALID_FILE_TYPE', errorMessage));
    },
  });

export const upload = createUploadMiddleware(
  ALLOWED_UPLOAD_MIME_TYPES,
  ALLOWED_UPLOAD_EXTENSIONS,
  'Only approved image and video uploads are allowed',
);

export const avatarUpload = createUploadMiddleware(
  ALLOWED_IMAGE_UPLOAD_MIME_TYPES,
  ALLOWED_IMAGE_UPLOAD_EXTENSIONS,
  'Only JPG, PNG, and WEBP profile images are allowed',
);
