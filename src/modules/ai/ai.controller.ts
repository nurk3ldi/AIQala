import { Request, Response } from 'express';

import { DraftCommentDto, AnalyzeIssueDto, ModerateTextDto } from './dto/ai.dto';
import { AiService } from './ai.service';

export class AiController {
  constructor(private readonly aiService: AiService) {}

  moderateText = async (request: Request, response: Response): Promise<void> => {
    const result = await this.aiService.moderateText(request.body as ModerateTextDto);

    response.status(200).json({
      success: true,
      data: result,
    });
  };

  analyzeIssue = async (request: Request, response: Response): Promise<void> => {
    const result = await this.aiService.analyzeIssue(request.body as AnalyzeIssueDto);

    response.status(200).json({
      success: true,
      data: result,
    });
  };

  analyzeExistingRequest = async (request: Request, response: Response): Promise<void> => {
    const result = await this.aiService.analyzeExistingRequest(request.user!, request.params.id as string);

    response.status(200).json({
      success: true,
      data: result,
    });
  };

  draftComment = async (request: Request, response: Response): Promise<void> => {
    const result = await this.aiService.draftComment(
      request.user!,
      request.params.id as string,
      request.body as DraftCommentDto,
    );

    response.status(200).json({
      success: true,
      data: result,
    });
  };
}
