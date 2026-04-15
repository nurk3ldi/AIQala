import { Request, Response } from 'express';

import { AnalyticsService } from './analytics.service';

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  getOverview = async (_request: Request, response: Response): Promise<void> => {
    const result = await this.analyticsService.getOverview();

    response.status(200).json({
      success: true,
      data: result,
    });
  };
}
