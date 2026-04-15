export const ALLOWED_IMAGE_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_IMAGE_UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

export const ALLOWED_VIDEO_UPLOAD_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const ALLOWED_VIDEO_UPLOAD_EXTENSIONS = ['.mp4', '.webm', '.mov'] as const;

export const ALLOWED_UPLOAD_MIME_TYPES = [...ALLOWED_IMAGE_UPLOAD_MIME_TYPES, ...ALLOWED_VIDEO_UPLOAD_MIME_TYPES] as const;
export const ALLOWED_UPLOAD_EXTENSIONS = [...ALLOWED_IMAGE_UPLOAD_EXTENSIONS, ...ALLOWED_VIDEO_UPLOAD_EXTENSIONS] as const;
