export enum RequestStatus {
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
}

export enum RequestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export const REQUEST_STATUSES = Object.values(RequestStatus);
export const REQUEST_PRIORITIES = Object.values(RequestPriority);
export const MEDIA_TYPES = Object.values(MediaType);
