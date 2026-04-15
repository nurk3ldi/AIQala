import { MediaType } from '../../common/constants/request.constants';

import { MediaRepository } from './media.repository';

export class MediaService {
  constructor(private readonly mediaRepository: MediaRepository) {}

  createOrganizationMedia(requestId: string, organizationId: string, fileUrl: string, type: MediaType) {
    return this.mediaRepository.create({
      requestId,
      fileUrl,
      type,
      uploadedByOrganizationId: organizationId,
      uploadedByUserId: null,
    });
  }

  createUserMedia(requestId: string, userId: string, fileUrl: string, type: MediaType) {
    return this.mediaRepository.create({
      requestId,
      fileUrl,
      type,
      uploadedByOrganizationId: null,
      uploadedByUserId: userId,
    });
  }

  countUserMediaByRequest(requestId: string, userId: string) {
    return this.mediaRepository.countUserMediaByRequest(requestId, userId);
  }
}
