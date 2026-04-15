import { AnalyticsRepository } from './analytics.repository';

export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  getOverview() {
    return this.analyticsRepository.getOverview();
  }
}
