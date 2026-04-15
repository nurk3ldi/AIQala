import { CommentsRepository } from './comments.repository';

export class CommentsService {
  constructor(private readonly commentsRepository: CommentsRepository) {}

  createOrganizationComment(requestId: string, organizationId: string, text: string) {
    return this.commentsRepository.create({
      requestId,
      authorOrganizationId: organizationId,
      authorUserId: null,
      text,
    });
  }
}
