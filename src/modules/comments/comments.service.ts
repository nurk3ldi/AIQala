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

  createUserComment(requestId: string, userId: string, text: string) {
    return this.commentsRepository.create({
      requestId,
      authorOrganizationId: null,
      authorUserId: userId,
      text,
    });
  }

  findById(id: string) {
    return this.commentsRepository.findById(id);
  }

  updateText(id: string, text: string) {
    return this.commentsRepository.updateText(id, text);
  }

  removeById(id: string) {
    return this.commentsRepository.removeById(id);
  }
}
