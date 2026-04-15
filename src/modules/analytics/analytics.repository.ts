import { QueryTypes } from 'sequelize';

import { RequestStatus } from '../../common/constants/request.constants';
import { sequelize } from '../../database/sequelize';

interface OverviewCountsRow {
  totalRequests: string | number;
  resolvedRequestsCount: string | number;
  acceptedRequestsCount: string | number;
  inProgressRequestsCount: string | number;
  assignedRequestsCount: string | number;
  unassignedRequestsCount: string | number;
  totalComments: string | number;
  totalMedia: string | number;
  totalCategories: string | number;
  totalCities: string | number;
  totalDistricts: string | number;
  totalOrganizations: string | number;
  activeOrganizationsCount: string | number;
}

interface AvgResolutionRow {
  avg_seconds: string | number | null;
}

interface RequestsByCategoryRow {
  categoryId: string;
  categoryName: string;
  totalRequests: string | number;
}

interface RequestsByStatusRow {
  status: string;
  totalRequests: string | number;
}

interface RequestsByPriorityRow {
  priority: string;
  totalRequests: string | number;
}

interface RequestsTrendRow {
  date: string;
  totalRequests: string | number;
  resolvedRequests: string | number;
}

interface RequestsByCityRow {
  cityId: string;
  cityName: string;
  totalRequests: string | number;
}

interface TopOrganizationRow {
  organizationId: string;
  organizationName: string;
  totalRequests: string | number;
}

interface RecentRequestRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  categoryName: string | null;
  cityName: string | null;
  organizationName: string | null;
}

export class AnalyticsRepository {
  async getOverview() {
    const [
      counts,
      avgResolution,
      requestsByCategory,
      requestsByStatus,
      requestsByPriority,
      requestsTrend,
      requestsByCity,
      topOrganizations,
      recentRequests,
    ] = await Promise.all([
      sequelize.query<OverviewCountsRow>(
        `SELECT
           (SELECT COUNT(*)::int FROM requests) AS "totalRequests",
           (SELECT COUNT(*)::int FROM requests WHERE status = :resolvedStatus) AS "resolvedRequestsCount",
           (SELECT COUNT(*)::int FROM requests WHERE status = :acceptedStatus) AS "acceptedRequestsCount",
           (SELECT COUNT(*)::int FROM requests WHERE status = :inProgressStatus) AS "inProgressRequestsCount",
           (SELECT COUNT(*)::int FROM requests WHERE organization_id IS NOT NULL) AS "assignedRequestsCount",
           (SELECT COUNT(*)::int FROM requests WHERE organization_id IS NULL) AS "unassignedRequestsCount",
           (SELECT COUNT(*)::int FROM comments) AS "totalComments",
           (SELECT COUNT(*)::int FROM media) AS "totalMedia",
           (SELECT COUNT(*)::int FROM categories) AS "totalCategories",
           (SELECT COUNT(*)::int FROM cities) AS "totalCities",
           (SELECT COUNT(*)::int FROM districts) AS "totalDistricts",
           (SELECT COUNT(*)::int FROM organizations) AS "totalOrganizations",
           (SELECT COUNT(*)::int FROM organizations WHERE is_active = true) AS "activeOrganizationsCount"`,
        {
          replacements: {
            resolvedStatus: RequestStatus.RESOLVED,
            acceptedStatus: RequestStatus.ACCEPTED,
            inProgressStatus: RequestStatus.IN_PROGRESS,
          },
          type: QueryTypes.SELECT,
        },
      ),
      sequelize.query<AvgResolutionRow>(
        `SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, updated_at) - created_at))) AS avg_seconds
         FROM requests
         WHERE status = :status`,
        {
          replacements: { status: RequestStatus.RESOLVED },
          type: QueryTypes.SELECT,
        },
      ),
      sequelize.query<RequestsByCategoryRow>(
        `SELECT c.id AS "categoryId", c.name AS "categoryName", COUNT(r.id)::int AS "totalRequests"
         FROM categories c
         LEFT JOIN requests r ON r.category_id = c.id
         GROUP BY c.id, c.name
         ORDER BY "totalRequests" DESC, c.name ASC`,
        {
          type: QueryTypes.SELECT,
        },
      ),
      sequelize.query<RequestsByStatusRow>(
        `SELECT status, COUNT(*)::int AS "totalRequests"
         FROM requests
         GROUP BY status
         ORDER BY "totalRequests" DESC, status ASC`,
        {
          type: QueryTypes.SELECT,
        },
      ),
      sequelize.query<RequestsByPriorityRow>(
        `SELECT priority, COUNT(*)::int AS "totalRequests"
         FROM requests
         GROUP BY priority
         ORDER BY "totalRequests" DESC, priority ASC`,
        {
          type: QueryTypes.SELECT,
        },
      ),
      sequelize.query<RequestsTrendRow>(
        `SELECT
           TO_CHAR(series.day_bucket, 'YYYY-MM-DD') AS date,
           COUNT(r.id)::int AS "totalRequests",
           COUNT(r.id) FILTER (WHERE r.status = :resolvedStatus)::int AS "resolvedRequests"
         FROM generate_series(CURRENT_DATE - INTERVAL '11 days', CURRENT_DATE, INTERVAL '1 day') AS series(day_bucket)
         LEFT JOIN requests r
           ON DATE(r.created_at) = DATE(series.day_bucket)
         GROUP BY series.day_bucket
         ORDER BY series.day_bucket ASC`,
        {
          replacements: { resolvedStatus: RequestStatus.RESOLVED },
          type: QueryTypes.SELECT,
        },
      ),
      sequelize.query<RequestsByCityRow>(
        `SELECT
           c.id AS "cityId",
           c.name AS "cityName",
           COUNT(r.id)::int AS "totalRequests"
         FROM cities c
         LEFT JOIN requests r ON r.city_id = c.id
         GROUP BY c.id, c.name
         ORDER BY "totalRequests" DESC, c.name ASC
         LIMIT 6`,
        {
          type: QueryTypes.SELECT,
        },
      ),
      sequelize.query<TopOrganizationRow>(
        `SELECT
           o.id AS "organizationId",
           o.name AS "organizationName",
           COUNT(r.id)::int AS "totalRequests"
         FROM organizations o
         LEFT JOIN requests r ON r.organization_id = o.id
         GROUP BY o.id, o.name
         ORDER BY "totalRequests" DESC, o.name ASC
         LIMIT 6`,
        {
          type: QueryTypes.SELECT,
        },
      ),
      sequelize.query<RecentRequestRow>(
        `SELECT
           r.id,
           r.title,
           r.status,
           r.priority,
           r.created_at AS "createdAt",
           c.name AS "categoryName",
           ci.name AS "cityName",
           o.name AS "organizationName"
         FROM requests r
         LEFT JOIN categories c ON c.id = r.category_id
         LEFT JOIN cities ci ON ci.id = r.city_id
         LEFT JOIN organizations o ON o.id = r.organization_id
         ORDER BY r.created_at DESC
         LIMIT 6`,
        {
          type: QueryTypes.SELECT,
        },
      ),
    ]);

    const summary = counts[0];

    return {
      totalRequests: Number(summary?.totalRequests ?? 0),
      resolvedRequestsCount: Number(summary?.resolvedRequestsCount ?? 0),
      acceptedRequestsCount: Number(summary?.acceptedRequestsCount ?? 0),
      inProgressRequestsCount: Number(summary?.inProgressRequestsCount ?? 0),
      averageResolutionTimeHours: Number(avgResolution[0]?.avg_seconds ?? 0) / 3600,
      assignedRequestsCount: Number(summary?.assignedRequestsCount ?? 0),
      unassignedRequestsCount: Number(summary?.unassignedRequestsCount ?? 0),
      totalComments: Number(summary?.totalComments ?? 0),
      totalMedia: Number(summary?.totalMedia ?? 0),
      totalCategories: Number(summary?.totalCategories ?? 0),
      totalCities: Number(summary?.totalCities ?? 0),
      totalDistricts: Number(summary?.totalDistricts ?? 0),
      totalOrganizations: Number(summary?.totalOrganizations ?? 0),
      activeOrganizationsCount: Number(summary?.activeOrganizationsCount ?? 0),
      requestsByCategory: requestsByCategory.map((item) => ({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        totalRequests: Number(item.totalRequests),
      })),
      requestsByStatus: requestsByStatus.map((item) => ({
        status: item.status,
        totalRequests: Number(item.totalRequests),
      })),
      requestsByPriority: requestsByPriority.map((item) => ({
        priority: item.priority,
        totalRequests: Number(item.totalRequests),
      })),
      requestsTrend: requestsTrend.map((item) => ({
        date: item.date,
        totalRequests: Number(item.totalRequests),
        resolvedRequests: Number(item.resolvedRequests),
      })),
      requestsByCity: requestsByCity.map((item) => ({
        cityId: item.cityId,
        cityName: item.cityName,
        totalRequests: Number(item.totalRequests),
      })),
      topOrganizations: topOrganizations.map((item) => ({
        organizationId: item.organizationId,
        organizationName: item.organizationName,
        totalRequests: Number(item.totalRequests),
      })),
      recentRequests: recentRequests.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        priority: item.priority,
        createdAt: item.createdAt,
        categoryName: item.categoryName,
        cityName: item.cityName,
        organizationName: item.organizationName,
      })),
    };
  }
}
