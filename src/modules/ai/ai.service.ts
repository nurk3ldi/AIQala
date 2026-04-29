import { RequestPriority, REQUEST_PRIORITIES, REQUEST_STATUSES } from '../../common/constants/request.constants';
import { UserRole } from '../../common/constants/roles';
import { AppError } from '../../common/errors/app.error';
import { env } from '../../config/env';
import { AuthenticatedUser } from '../../types/auth';

import { DraftCommentDto, AnalyzeIssueDto, ModerateTextDto, EnhanceDescriptionDto } from './dto/ai.dto';
import { GeminiClient } from './gemini.client';
import { AiRepository } from './ai.repository';

interface ModerationResult {
  isAllowed: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  isSpam: boolean;
  containsAbuse: boolean;
  containsPersonalData: boolean;
  explanation: string;
  suggestedAction: string;
  sanitizedText: string | null;
}

interface RequestAnalysisResult {
  summary: string;
  issueType: string;
  priority: RequestPriority;
  confidence: number;
  reasoning: string;
  suggestedCategoryId: string | null;
  suggestedOrganizationId: string | null;
  extractedLocationHints: string[];
  recommendedActions: string[];
  moderation: {
    isSafe: boolean;
    isSpam: boolean;
    containsAbuse: boolean;
    explanation: string;
  };
}

interface EnhanceDescriptionResult {
  enhancedDescription: string;
  summary: string;
  keyIssues: string[];
  suggestions: string[];
}

interface DraftCommentResult {
  commentText: string;
  internalSummary: string;
  suggestedStatus: string;
}

interface ChatResult {
  answer: string;
}

const moderationSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    isAllowed: { type: 'boolean' },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
    isSpam: { type: 'boolean' },
    containsAbuse: { type: 'boolean' },
    containsPersonalData: { type: 'boolean' },
    explanation: { type: 'string' },
    suggestedAction: { type: 'string' },
    sanitizedText: { type: ['string', 'null'] },
  },
  required: ['isAllowed', 'riskLevel', 'isSpam', 'containsAbuse', 'containsPersonalData', 'explanation', 'suggestedAction', 'sanitizedText'],
};

const requestAnalysisSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    issueType: { type: 'string' },
    priority: { type: 'string', enum: REQUEST_PRIORITIES },
    confidence: { type: 'number' },
    reasoning: { type: 'string' },
    suggestedCategoryId: { type: ['string', 'null'] },
    suggestedOrganizationId: { type: ['string', 'null'] },
    extractedLocationHints: {
      type: 'array',
      items: { type: 'string' },
    },
    recommendedActions: {
      type: 'array',
      items: { type: 'string' },
    },
    moderation: {
      type: 'object',
      properties: {
        isSafe: { type: 'boolean' },
        isSpam: { type: 'boolean' },
        containsAbuse: { type: 'boolean' },
        explanation: { type: 'string' },
      },
      required: ['isSafe', 'isSpam', 'containsAbuse', 'explanation'],
    },
  },
  required: [
    'summary',
    'issueType',
    'priority',
    'confidence',
    'reasoning',
    'suggestedCategoryId',
    'suggestedOrganizationId',
    'extractedLocationHints',
    'recommendedActions',
    'moderation',
  ],
};

const draftCommentSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    commentText: { type: 'string' },
    internalSummary: { type: 'string' },
    suggestedStatus: { type: 'string' },
  },
  required: ['commentText', 'internalSummary', 'suggestedStatus'],
};

const enhanceDescriptionSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    enhancedDescription: { type: 'string' },
    summary: { type: 'string' },
    keyIssues: {
      type: 'array',
      items: { type: 'string' },
    },
    suggestions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['enhancedDescription', 'summary', 'keyIssues', 'suggestions'],
};

export class AiService {
  constructor(
    private readonly aiRepository: AiRepository,
    private readonly geminiClient: GeminiClient,
  ) {}

  async moderateText(payload: ModerateTextDto) {
    const result = await this.geminiClient.generateStructured<ModerationResult>({
      model: env.ai.moderationModel,
      systemInstruction:
        'You are a safety and spam moderation assistant for a municipal issue-reporting platform. Return strict JSON only. All human-readable explanation fields must be in Kazakh. Keep enum values exactly as required by schema.',
      prompt: [
        `Context: ${payload.context ?? 'general'}`,
        'Evaluate whether the text is allowed for a public civic issue tracking platform.',
        'Mark abuse, spam, personal-data leakage, threats, or unrelated content.',
        'If the text is acceptable but noisy, provide a sanitized version.',
        `Text:\n${payload.text}`,
      ].join('\n\n'),
      schema: moderationSchema,
      temperature: 0.1,
      maxOutputTokens: 800,
    });

    return {
      ...result,
      riskLevel: ['low', 'medium', 'high'].includes(result.riskLevel) ? result.riskLevel : 'medium',
    };
  }

  async analyzeIssue(payload: AnalyzeIssueDto) {
    const [categories, organizations] = await Promise.all([
      this.aiRepository.getActiveCategories(),
      this.aiRepository.getActiveOrganizations(),
    ]);

    const categoryOptions = categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
    }));

    const organizationOptions = organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      cityId: organization.cityId,
      districtId: organization.districtId,
      categoryIds: ((organization as unknown as { categories?: Array<{ id: string }> }).categories ?? []).map((category) => category.id),
    }));

    const result = await this.geminiClient.generateStructured<RequestAnalysisResult>({
      model: env.ai.analysisModel,
      systemInstruction: [
        'You are an AI triage assistant for a Smart City issue tracking system.',
        'Choose only IDs from the provided categories and organizations.',
        'Prefer organizations that match the category and same city/district when possible.',
        'If unsure, return null for suggested IDs.',
        'Return all explanatory and user-facing text fields in Kazakh.',
        'Return strict JSON only.',
      ].join(' '),
      prompt: [
        'Issue to analyze:',
        JSON.stringify(
          {
            title: payload.title,
            description: payload.description,
            cityId: payload.cityId ?? null,
            districtId: payload.districtId ?? null,
          },
          null,
          2,
        ),
        'Available categories:',
        JSON.stringify(categoryOptions, null, 2),
        'Available organizations:',
        JSON.stringify(organizationOptions, null, 2),
      ].join('\n\n'),
      schema: requestAnalysisSchema,
      temperature: 0.2,
      maxOutputTokens: 1600,
    });

    const matchedCategory = categories.find((category) => category.id === result.suggestedCategoryId) ?? null;
    const matchedOrganization = organizations.find((organization) => organization.id === result.suggestedOrganizationId) ?? null;

    return {
      summary: result.summary,
      issueType: result.issueType,
      priority: REQUEST_PRIORITIES.includes(result.priority) ? result.priority : RequestPriority.MEDIUM,
      confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0)),
      reasoning: result.reasoning,
      extractedLocationHints: result.extractedLocationHints ?? [],
      recommendedActions: result.recommendedActions ?? [],
      moderation: result.moderation,
      suggestedCategory: matchedCategory
        ? {
            id: matchedCategory.id,
            name: matchedCategory.name,
          }
        : null,
      suggestedOrganization: matchedOrganization
        ? {
            id: matchedOrganization.id,
            name: matchedOrganization.name,
          }
        : null,
    };
  }

  async enhanceDescription(payload: { description: string; title?: string }) {
    const result = await this.geminiClient.generateStructured<EnhanceDescriptionResult>({
      model: env.ai.draftModel,
      systemInstruction: [
        'You are an AI assistant that helps improve issue descriptions for a Smart City reporting platform.',
        'Enhance the provided description to make it clearer, more professional, and more actionable.',
        'Preserve the original meaning while improving clarity and adding relevant details.',
        'Identify key issues and provide practical suggestions.',
        'Write all output text fields in Kazakh.',
        'Return strict JSON only.',
      ].join(' '),
      prompt: [
        'Please enhance this issue description:',
        `Title: ${payload.title || 'Not provided'}`,
        `Original description:\n${payload.description}`,
        'Provide an enhanced version that is more clear, professional, and actionable while preserving the original meaning.',
        'Also identify key issues mentioned and provide improvement suggestions.',
      ].join('\n\n'),
      schema: enhanceDescriptionSchema,
      temperature: 0.5,
      maxOutputTokens: 1200,
    });

    return {
      enhancedDescription: result.enhancedDescription.trim(),
      summary: result.summary.trim(),
      keyIssues: result.keyIssues ?? [],
      suggestions: result.suggestions ?? [],
    };
  }

  async chat(payload: { message: string; cityId?: string }) {
    const chatSchema: Record<string, unknown> = {
      type: 'object',
      properties: {
        answer: { type: 'string' },
      },
      required: ['answer'],
    };

    const promptParts = [
      "You are an expert assistant about municipal services and city information. Answer user questions about the city clearly and helpfully in Kazakh.",
      `User question:\n${payload.message}`,
    ];

    if (payload.cityId) {
      promptParts.unshift(`Context: question is about city with id ${payload.cityId}`);
    }

    const result = await this.geminiClient.generateStructured<ChatResult>({
      model: env.ai.draftModel,
      systemInstruction: [
        'You are a helpful assistant for a Smart City platform.',
        'Answer concisely and in Kazakh.',
        'Return strict JSON only with the required schema.',
      ].join(' '),
      prompt: promptParts.join('\n\n'),
      schema: chatSchema,
      temperature: 0.3,
      maxOutputTokens: 800,
    });

    return {
      answer: result.answer.trim(),
    };
  }

  async analyzeExistingRequest(currentUser: AuthenticatedUser, requestId: string) {
    const request = await this.aiRepository.findRequestById(requestId);

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found');
    }

    this.assertRequestAccess(currentUser, request.userId, request.organizationId);

    return this.analyzeIssue({
      title: request.title,
      description: request.description,
      cityId: request.cityId,
      districtId: request.districtId ?? undefined,
    });
  }

  async draftComment(currentUser: AuthenticatedUser, requestId: string, payload: DraftCommentDto) {
    const request = await this.aiRepository.findRequestById(requestId);

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found');
    }

    this.assertRequestAccess(currentUser, request.userId, request.organizationId);

    if (currentUser.role === UserRole.USER) {
      throw new AppError(403, 'FORBIDDEN', 'Users cannot generate official comment drafts');
    }

    const result = await this.geminiClient.generateStructured<DraftCommentResult>({
      model: env.ai.draftModel,
      systemInstruction: [
        'You draft short official replies for a civic issue tracking platform.',
        'Be clear, professional, and practical.',
        'Never invent completed work if it is not stated in the request context.',
        'Write all textual fields in Kazakh.',
        'Return strict JSON only.',
      ].join(' '),
      prompt: [
        'Draft a public-facing comment for this request.',
        JSON.stringify(
          {
            title: request.title,
            description: request.description,
            currentStatus: request.status,
            priority: request.priority,
            category: (request as unknown as { category?: { name?: string } }).category?.name ?? null,
            city: (request as unknown as { city?: { name?: string } }).city?.name ?? null,
            district: (request as unknown as { district?: { name?: string } }).district?.name ?? null,
            assignedOrganization: (request as unknown as { organization?: { name?: string } }).organization?.name ?? null,
          },
          null,
          2,
        ),
        'Draft settings:',
        JSON.stringify(
          {
            objective: payload.objective ?? 'status_update',
            tone: payload.tone ?? 'formal',
            includeNextSteps: payload.includeNextSteps ?? true,
            extraInstructions: payload.extraInstructions ?? null,
          },
          null,
          2,
        ),
      ].join('\n\n'),
      schema: draftCommentSchema,
      temperature: 0.4,
      maxOutputTokens: 1200,
    });

    return {
      commentText: result.commentText.trim(),
      internalSummary: result.internalSummary.trim(),
      suggestedStatus: REQUEST_STATUSES.some((status) => status === result.suggestedStatus) ? result.suggestedStatus : null,
    };
  }

  private assertRequestAccess(currentUser: AuthenticatedUser, ownerUserId: string, organizationId?: string | null): void {
    if (currentUser.role === UserRole.ADMIN) {
      return;
    }

    if (currentUser.role === UserRole.USER) {
      if (currentUser.id !== ownerUserId) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have access to this request');
      }

      return;
    }

    if (!currentUser.organizationId || currentUser.organizationId !== organizationId) {
      throw new AppError(403, 'FORBIDDEN', 'This request is not assigned to your organization');
    }
  }
}
