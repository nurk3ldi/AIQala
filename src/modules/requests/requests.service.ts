import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { fileTypeFromBuffer } from 'file-type';

import { NotificationType } from '../../common/constants/notification.constants';
import { MediaType, RequestPriority, RequestStatus } from '../../common/constants/request.constants';
import { UserRole } from '../../common/constants/roles';
import { ALLOWED_UPLOAD_MIME_TYPES } from '../../common/constants/upload.constants';
import { AppError } from '../../common/errors/app.error';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/query.util';
import { env } from '../../config/env';
import {
  CategoryModel,
  CityModel,
  DistrictModel,
  IssueRequestModel,
  OrganizationCategoryModel,
  OrganizationModel,
} from '../../database/models';
import { AuthenticatedUser } from '../../types/auth';
import { AiService } from '../ai/ai.service';
import { CommentsService } from '../comments/comments.service';
import { MediaService } from '../media/media.service';
import { NotificationsService } from '../notifications/notifications.service';

import { AssignRequestDto, CreateCommentDto, CreateRequestDto, RequestListQueryDto, UpdateCommentDto, UpdateRequestDto, UpdateRequestStatusDto } from './dto/request.dto';
import { RequestsRepository } from './requests.repository';

export class RequestsService {
  private static readonly MAX_USER_REQUEST_MEDIA = 3;
  private static readonly MAX_ORGANIZATION_REQUEST_MEDIA = 3;

  constructor(
    private readonly requestsRepository: RequestsRepository,
    private readonly commentsService: CommentsService,
    private readonly mediaService: MediaService,
    private readonly notificationsService: NotificationsService,
    private readonly aiService: AiService,
  ) {}

  async createRequest(userId: string, payload: CreateRequestDto) {
    await this.ensureCategoryExists(payload.categoryId);
    await this.ensureLocationIntegrity(payload.cityId, payload.districtId);
    await this.ensureRequestedOrganizationIntegrity(payload.organizationId, payload.categoryId, payload.cityId);

    const aiModeration = await this.tryModerateRequestPayload(payload.title, payload.description);

    if (aiModeration && !aiModeration.isAllowed) {
      throw new AppError(400, 'REQUEST_REJECTED_BY_AI', 'Request content was rejected by automated moderation', aiModeration);
    }

    const aiAnalysis = await this.tryAnalyzeRequestPayload(payload);

    const aiSuggestedPriority =
      aiAnalysis && 'priority' in aiAnalysis ? (aiAnalysis.priority as RequestPriority | undefined) : undefined;

    return this.requestsRepository.create({
      title: payload.title.trim(),
      description: payload.description.trim(),
      categoryId: payload.categoryId,
      cityId: payload.cityId,
      districtId: payload.districtId ?? null,
      latitude: payload.latitude,
      longitude: payload.longitude,
      priority: (payload.priority as RequestPriority | undefined) ?? aiSuggestedPriority ?? RequestPriority.MEDIUM,
      status: RequestStatus.ACCEPTED,
      userId,
      organizationId: payload.organizationId ?? null,
      aiInsight: aiAnalysis
        ? {
            generatedAt: new Date().toISOString(),
            moderation: aiModeration,
            analysis: aiAnalysis,
          }
        : aiModeration
          ? {
              generatedAt: new Date().toISOString(),
              moderation: aiModeration,
            }
          : null,
    });
  }

  async listMyRequests(userId: string, query: RequestListQueryDto) {
    const pagination = buildPagination(query.page, query.limit);
    const where = this.buildWhereClause(query);

    where.userId = userId;

    const result = await this.requestsRepository.list({
      where,
      offset: pagination.offset,
      limit: pagination.limit,
      order: [['createdAt', 'DESC']],
    });

    return buildPaginatedResponse(result.rows, result.count, pagination.page, pagination.limit);
  }

  async getMyRequestById(userId: string, id: string) {
    const request = await this.requestsRepository.findById(id);

    if (!request || request.userId !== userId) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found');
    }

    return request;
  }

  async listRequests(currentUser: AuthenticatedUser, query: RequestListQueryDto) {
    const pagination = buildPagination(query.page, query.limit);
    const where = this.buildWhereClause(query);

    if (currentUser.role === UserRole.ORGANIZATION) {
      if (!currentUser.organizationId) {
        throw new AppError(403, 'FORBIDDEN', 'Organization account is not linked');
      }

      where.organizationId = currentUser.organizationId;
    }

    const result = await this.requestsRepository.list({
      where,
      offset: pagination.offset,
      limit: pagination.limit,
      order: [['createdAt', 'DESC']],
    });

    return buildPaginatedResponse(result.rows, result.count, pagination.page, pagination.limit);
  }

  async getRequestDetail(currentUser: AuthenticatedUser, id: string) {
    const request = await this.requestsRepository.findById(id);

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found');
    }

    this.assertAccess(currentUser, request);

    return request;
  }

  async assignRequest(id: string, payload: AssignRequestDto) {
    const request = await this.requestsRepository.findByIdPlain(id);

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found');
    }

    const organization = await OrganizationModel.findByPk(payload.organizationId);

    if (!organization || !organization.isActive) {
      throw new AppError(400, 'ORGANIZATION_NOT_FOUND', 'Active organization not found');
    }

    if (organization.cityId !== request.cityId) {
      throw new AppError(400, 'ORGANIZATION_CITY_MISMATCH', 'Organization does not belong to the request city');
    }

    const organizationSupportsCategory = await OrganizationCategoryModel.count({
      where: {
        organizationId: payload.organizationId,
        categoryId: request.categoryId,
      },
    });

    if (!organizationSupportsCategory) {
      throw new AppError(400, 'CATEGORY_NOT_ASSIGNED', 'Organization is not linked to this category');
    }

    await request.update({
      organizationId: payload.organizationId,
      priority: (payload.priority as RequestPriority | undefined) ?? request.priority,
    });

    await this.notificationsService.createNotification({
      userId: request.userId,
      type: NotificationType.REQUEST_ASSIGNED,
      title: 'Өтінім ұйымға жіберілді',
      message: `"${request.title}" атты өтініміңіз жауапты ұйымға тағайындалды.`,
    });

    return this.requestsRepository.findById(id);
  }

  async updateRequestStatus(currentUser: AuthenticatedUser, id: string, payload: UpdateRequestStatusDto) {
    const request = await this.requestsRepository.findByIdPlain(id);

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found');
    }

    this.assertOrganizationOwnership(currentUser, request);

    const nextStatus = payload.status as RequestStatus;

    await request.update({
      status: nextStatus,
      resolvedAt: nextStatus === RequestStatus.RESOLVED ? new Date() : null,
    });

    await this.notificationsService.createNotification({
      userId: request.userId,
      type: NotificationType.REQUEST_STATUS_CHANGED,
      title: 'Өтінім мәртебесі жаңартылды',
      message: `"${request.title}" атты өтініміңіздің мәртебесі: ${this.translateStatus(nextStatus)}.`,
    });

    return this.requestsRepository.findById(id);
  }

  async updateRequest(currentUser: AuthenticatedUser, id: string, payload: UpdateRequestDto) {
    const request = await this.requestsRepository.findByIdPlain(id);

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found');
    }

    if (currentUser.role === UserRole.USER && request.userId !== currentUser.id) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this request');
    }

    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.USER) {
      throw new AppError(403, 'FORBIDDEN', 'This role cannot update requests');
    }

    const nextCityId = payload.cityId ?? request.cityId;
    const nextDistrictId = payload.districtId ?? request.districtId;
    const nextCategoryId = payload.categoryId ?? request.categoryId;
    const nextOrganizationId = payload.organizationId ?? request.organizationId;

    if (payload.categoryId) {
      await this.ensureCategoryExists(payload.categoryId);
    }

    if (payload.cityId || payload.districtId !== undefined) {
      await this.ensureLocationIntegrity(nextCityId, nextDistrictId);
    }

    if (payload.organizationId !== undefined || payload.categoryId || payload.cityId) {
      await this.ensureRequestedOrganizationIntegrity(
        nextOrganizationId ?? undefined,
        nextCategoryId,
        nextCityId,
      );
    }

    await request.update({
      title: payload.title?.trim() ?? request.title,
      description: payload.description?.trim() ?? request.description,
      categoryId: nextCategoryId,
      cityId: nextCityId,
      districtId: nextDistrictId,
      organizationId: nextOrganizationId,
      latitude: payload.latitude ?? request.latitude,
      longitude: payload.longitude ?? request.longitude,
      priority: (payload.priority as RequestPriority | undefined) ?? request.priority,
    });

    return this.requestsRepository.findById(id);
  }

  async addComment(currentUser: AuthenticatedUser, id: string, payload: CreateCommentDto) {
    const request = await this.requestsRepository.findByIdPlain(id);
    const source = payload.source ?? 'chat';

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found');
    }

    if (currentUser.role === UserRole.USER) {
      return this.commentsService.createUserComment(
        id,
        currentUser.id,
        payload.text.trim(),
        source,
      );
    }

    if (currentUser.role !== UserRole.ORGANIZATION) {
      throw new AppError(403, 'FORBIDDEN', 'This role cannot add comments to requests');
    }

    this.assertOrganizationOwnership(currentUser, request);

    const moderation = await this.tryModerateOrganizationComment(payload.text);

    if (moderation && !moderation.isAllowed) {
      throw new AppError(400, 'COMMENT_REJECTED_BY_AI', 'Comment content was rejected by automated moderation', moderation);
    }

    const comment = await this.commentsService.createOrganizationComment(
      id,
      currentUser.organizationId!,
      (moderation?.sanitizedText ?? payload.text).trim(),
      source,
    );

    await this.notificationsService.createNotification({
      userId: request.userId,
      type: NotificationType.REQUEST_COMMENT_ADDED,
      title: 'Өтінімге жаңа пікір қосылды',
      message: `"${request.title}" атты өтініміңізге ұйым тарапынан пікір қалдырылды.`,
    });

    return comment;
  }

  async updateComment(currentUser: AuthenticatedUser, id: string, commentId: string, payload: UpdateCommentDto) {
    const request = await this.requestsRepository.findByIdPlain(id);

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found');
    }

    const comment = await this.commentsService.findById(commentId);

    if (!comment || comment.requestId !== id) {
      throw new AppError(404, 'COMMENT_NOT_FOUND', 'Comment not found');
    }

    if (currentUser.role === UserRole.USER) {
      if (comment.authorUserId !== currentUser.id) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have access to this comment');
      }

      const updated = await this.commentsService.updateText(commentId, payload.text.trim());

      if (!updated) {
        throw new AppError(404, 'COMMENT_NOT_FOUND', 'Comment not found');
      }

      return updated;
    }

    if (currentUser.role === UserRole.ORGANIZATION) {
      this.assertOrganizationOwnership(currentUser, request);

      if (comment.authorOrganizationId !== currentUser.organizationId) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have access to this comment');
      }

      const moderation = await this.tryModerateOrganizationComment(payload.text);

      if (moderation && !moderation.isAllowed) {
        throw new AppError(400, 'COMMENT_REJECTED_BY_AI', 'Comment content was rejected by automated moderation', moderation);
      }

      const updated = await this.commentsService.updateText(
        commentId,
        (moderation?.sanitizedText ?? payload.text).trim(),
      );

      if (!updated) {
        throw new AppError(404, 'COMMENT_NOT_FOUND', 'Comment not found');
      }

      return updated;
    }

    throw new AppError(403, 'FORBIDDEN', 'This role cannot update comments');
  }

  async deleteComment(currentUser: AuthenticatedUser, id: string, commentId: string) {
    const request = await this.requestsRepository.findByIdPlain(id);

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found');
    }

    const comment = await this.commentsService.findById(commentId);

    if (!comment || comment.requestId !== id) {
      throw new AppError(404, 'COMMENT_NOT_FOUND', 'Comment not found');
    }

    if (currentUser.role === UserRole.USER) {
      if (comment.authorUserId !== currentUser.id) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have access to this comment');
      }
    } else if (currentUser.role === UserRole.ORGANIZATION) {
      this.assertOrganizationOwnership(currentUser, request);

      if (comment.authorOrganizationId !== currentUser.organizationId) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have access to this comment');
      }
    } else {
      throw new AppError(403, 'FORBIDDEN', 'This role cannot delete comments');
    }

    const deleted = await this.commentsService.removeById(commentId);

    if (!deleted) {
      throw new AppError(404, 'COMMENT_NOT_FOUND', 'Comment not found');
    }
  }

  async addMedia(currentUser: AuthenticatedUser, id: string, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new AppError(400, 'FILE_REQUIRED', 'Media file is required');
    }

    const request = await this.requestsRepository.findByIdPlain(id);

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found');
    }

    if (currentUser.role === UserRole.ORGANIZATION) {
      this.assertOrganizationOwnership(currentUser, request);

      const existingOrganizationMediaCount = await this.mediaService.countOrganizationMediaByRequest(
        id,
        currentUser.organizationId!,
      );

      if (existingOrganizationMediaCount >= RequestsService.MAX_ORGANIZATION_REQUEST_MEDIA) {
        throw new AppError(
          400,
          'REQUEST_MEDIA_LIMIT',
          `Only ${RequestsService.MAX_ORGANIZATION_REQUEST_MEDIA} photos can be attached to one request`,
        );
      }

      const { fileUrl, mediaType } = await this.persistUploadedMedia(file);

      return this.mediaService.createOrganizationMedia(
        id,
        currentUser.organizationId!,
        fileUrl,
        mediaType,
      );
    }

    if (currentUser.role === UserRole.USER) {
      if (request.userId !== currentUser.id) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have access to this request');
      }

      const existingUserMediaCount = await this.mediaService.countUserMediaByRequest(id, currentUser.id);

      if (existingUserMediaCount >= RequestsService.MAX_USER_REQUEST_MEDIA) {
        throw new AppError(
          400,
          'REQUEST_MEDIA_LIMIT',
          `Only ${RequestsService.MAX_USER_REQUEST_MEDIA} photos can be attached to one request`,
        );
      }

      const { fileUrl, mediaType } = await this.persistUploadedMedia(file, [MediaType.IMAGE]);

      return this.mediaService.createUserMedia(
        id,
        currentUser.id,
        fileUrl,
        mediaType,
      );
    }

    throw new AppError(403, 'FORBIDDEN', 'This role cannot upload media to requests');
  }

  async deleteRequest(currentUser: AuthenticatedUser, id: string) {
    const request = await this.requestsRepository.findByIdPlain(id);

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found');
    }

    if (currentUser.role === UserRole.ADMIN) {
      await request.destroy();
      return;
    }

    if (currentUser.role === UserRole.USER) {
      if (request.userId !== currentUser.id) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have access to this request');
      }

      await request.destroy();
      return;
    }

    throw new AppError(403, 'FORBIDDEN', 'This role cannot delete requests');
  }

  private buildWhereClause(query: RequestListQueryDto): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.cityId) {
      where.cityId = query.cityId;
    }

    if (query.districtId) {
      where.districtId = query.districtId;
    }

    if (query.organizationId) {
      where.organizationId = query.organizationId;
    }

    return where;
  }

  private translateStatus(status: RequestStatus): string {
    return (
      {
        [RequestStatus.ACCEPTED]: 'қабылданды',
        [RequestStatus.IN_PROGRESS]: 'орындалып жатыр',
        [RequestStatus.RESOLVED]: 'шешілді',
      }[status] ?? status
    );
  }

  private assertAccess(currentUser: AuthenticatedUser, request: IssueRequestModel): void {
    if (currentUser.role === UserRole.ADMIN) {
      return;
    }

    if (currentUser.role === UserRole.ORGANIZATION) {
      this.assertOrganizationOwnership(currentUser, request);
      return;
    }

    if (currentUser.role === UserRole.USER) {
      return;
    }

    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this request');
  }

  private assertOrganizationOwnership(currentUser: AuthenticatedUser, request: IssueRequestModel): void {
    if (currentUser.role !== UserRole.ORGANIZATION || !currentUser.organizationId) {
      throw new AppError(403, 'FORBIDDEN', 'Organization access required');
    }

    if (request.organizationId !== currentUser.organizationId) {
      throw new AppError(403, 'FORBIDDEN', 'This request is not assigned to your organization');
    }
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await CategoryModel.findByPk(categoryId);

    if (!category) {
      throw new AppError(400, 'CATEGORY_NOT_FOUND', 'Category not found');
    }
  }

  private async ensureLocationIntegrity(cityId: string, districtId?: string | null): Promise<void> {
    const city = await CityModel.findByPk(cityId);

    if (!city) {
      throw new AppError(400, 'CITY_NOT_FOUND', 'City not found');
    }

    if (!districtId) {
      return;
    }

    const district = await DistrictModel.findOne({
      where: {
        id: districtId,
        cityId,
      },
    });

    if (!district) {
      throw new AppError(400, 'DISTRICT_NOT_FOUND', 'District does not belong to the provided city');
    }
  }

  private async ensureRequestedOrganizationIntegrity(
    organizationId: string | undefined,
    categoryId: string,
    cityId: string,
  ): Promise<void> {
    if (!organizationId) {
      return;
    }

    const organization = await OrganizationModel.findByPk(organizationId);

    if (!organization || !organization.isActive) {
      throw new AppError(400, 'ORGANIZATION_NOT_FOUND', 'Active organization not found');
    }

    if (organization.cityId !== cityId) {
      throw new AppError(400, 'ORGANIZATION_CITY_MISMATCH', 'Organization does not belong to the provided city');
    }

    const categoryIsLinked = await OrganizationCategoryModel.count({
      where: {
        organizationId,
        categoryId,
      },
    });

    if (!categoryIsLinked) {
      throw new AppError(400, 'CATEGORY_NOT_ASSIGNED', 'Organization is not linked to this category');
    }
  }

  private async tryModerateRequestPayload(title: string, description: string) {
    if (!env.ai.enabled) {
      return null;
    }

    try {
      return await this.aiService.moderateText({
        text: `${title.trim()}\n\n${description.trim()}`,
        context: 'request',
      });
    } catch (error) {
      if (error instanceof AppError && ['AI_PROVIDER_ERROR', 'AI_TIMEOUT', 'AI_EMPTY_RESPONSE', 'AI_CONFIG_INVALID'].includes(error.code)) {
        if (env.ai.failClosed) {
          throw new AppError(503, 'AI_MODERATION_UNAVAILABLE', 'Automated moderation is temporarily unavailable');
        }

        return {
          isAllowed: true,
          riskLevel: 'low',
          isSpam: false,
          containsAbuse: false,
          containsPersonalData: false,
          explanation: `AI moderation skipped: ${error.message}`,
          suggestedAction: 'allow_without_ai_moderation',
          sanitizedText: null,
        };
      }

      throw error;
    }
  }

  private async tryAnalyzeRequestPayload(payload: CreateRequestDto) {
    if (!env.ai.enabled) {
      return null;
    }

    try {
      return await this.aiService.analyzeIssue({
        title: payload.title.trim(),
        description: payload.description.trim(),
        cityId: payload.cityId,
        districtId: payload.districtId,
      });
    } catch (error) {
      if (error instanceof AppError && ['AI_PROVIDER_ERROR', 'AI_TIMEOUT', 'AI_EMPTY_RESPONSE', 'AI_CONFIG_INVALID'].includes(error.code)) {
        return {
          skipped: true,
          reason: error.message,
        };
      }

      throw error;
    }
  }

  private async tryModerateOrganizationComment(text: string) {
    if (!env.ai.enabled) {
      return null;
    }

    try {
      return await this.aiService.moderateText({
        text: text.trim(),
        context: 'comment',
      });
    } catch (error) {
      if (error instanceof AppError && ['AI_PROVIDER_ERROR', 'AI_TIMEOUT', 'AI_EMPTY_RESPONSE', 'AI_CONFIG_INVALID'].includes(error.code)) {
        if (env.ai.failClosed) {
          throw new AppError(503, 'AI_MODERATION_UNAVAILABLE', 'Automated moderation is temporarily unavailable');
        }

        return null;
      }

      throw error;
    }
  }

  private async persistUploadedMedia(
    file: Express.Multer.File,
    allowedMediaTypes: MediaType[] = [MediaType.IMAGE, MediaType.VIDEO],
  ): Promise<{ fileUrl: string; mediaType: MediaType }> {
    if (!file.buffer?.length) {
      throw new AppError(400, 'INVALID_FILE_UPLOAD', 'Uploaded file is empty');
    }

    const detected = await fileTypeFromBuffer(file.buffer);

    if (!detected || !ALLOWED_UPLOAD_MIME_TYPES.includes(detected.mime as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
      throw new AppError(400, 'INVALID_FILE_TYPE', 'Uploaded file content does not match an allowed media format');
    }

    const mediaType = detected.mime.startsWith('image/') ? MediaType.IMAGE : MediaType.VIDEO;

    if (!allowedMediaTypes.includes(mediaType)) {
      throw new AppError(400, 'INVALID_FILE_TYPE', 'Only image uploads are allowed for this request');
    }

    const filename = `${randomUUID()}.${detected.ext}`;
    const uploadPath = path.resolve(process.cwd(), env.uploads.directory, filename);

    await fs.writeFile(uploadPath, file.buffer, {
      flag: 'wx',
    });

    return {
      fileUrl: `/${env.uploads.directory}/${filename}`,
      mediaType,
    };
  }
}
