export type UserRole = 'admin' | 'organization' | 'user';
export type RequestStatus = 'accepted' | 'in_progress' | 'resolved';
export type RequestPriority = 'low' | 'medium' | 'high';
export type MediaType = 'image' | 'video';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: UserRole;
  organizationId: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface City {
  id: string;
  name: string;
  region: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface District {
  id: string;
  name: string;
  cityId: string;
  latitude: string | null;
  longitude: string | null;
  createdAt: string;
  updatedAt: string;
  city?: City;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationAccount extends AuthUser {}

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string | null;
  description: string | null;
  cityId: string;
  districtId: string | null;
  address: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  city?: City;
  district?: District | null;
  categories?: Category[];
  accounts?: OrganizationAccount[];
}

export interface Comment {
  id: string;
  requestId: string;
  authorUserId: string | null;
  authorOrganizationId: string | null;
  text: string;
  source?: 'chat' | 'map' | null;
  createdAt: string;
  authorUser?: AuthUser | null;
  authorOrganization?: Organization | null;
}

export interface Media {
  id: string;
  requestId: string;
  fileUrl: string;
  type: MediaType;
  uploadedByUserId: string | null;
  uploadedByOrganizationId: string | null;
  createdAt: string;
  uploadedByUser?: AuthUser | null;
  uploadedByOrganization?: Organization | null;
}

export interface RequestAnalysisResult {
  summary: string;
  issueType: string;
  priority: RequestPriority;
  confidence: number;
  reasoning: string;
  extractedLocationHints: string[];
  recommendedActions: string[];
  moderation: {
    isSafe: boolean;
    isSpam: boolean;
    containsAbuse: boolean;
    explanation: string;
  };
  suggestedCategory: { id: string; name: string } | null;
  suggestedOrganization: { id: string; name: string } | null;
}

export interface ModerationResult {
  isAllowed: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  isSpam: boolean;
  containsAbuse: boolean;
  containsPersonalData: boolean;
  explanation: string;
  suggestedAction: string;
  sanitizedText: string | null;
}

export interface DraftCommentResult {
  commentText: string;
  internalSummary: string;
  suggestedStatus: RequestStatus | null;
}

export interface IssueRequest {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  cityId: string;
  districtId: string | null;
  latitude: string;
  longitude: string;
  status: RequestStatus;
  priority: RequestPriority;
  userId: string;
  organizationId: string | null;
  resolvedAt?: string | null;
  aiInsight?: {
    generatedAt?: string;
    moderation?: ModerationResult;
    analysis?: RequestAnalysisResult;
    [key: string]: unknown;
  } | null;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  city?: City;
  district?: District | null;
  organization?: Organization | null;
  requester?: AuthUser;
  comments?: Comment[];
  media?: Media[];
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AnalyticsOverview {
  totalRequests: number;
  resolvedRequestsCount: number;
  acceptedRequestsCount: number;
  inProgressRequestsCount: number;
  averageResolutionTimeHours: number;
  assignedRequestsCount: number;
  unassignedRequestsCount: number;
  totalComments: number;
  totalMedia: number;
  totalCategories: number;
  totalCities: number;
  totalDistricts: number;
  totalOrganizations: number;
  activeOrganizationsCount: number;
  requestsByCategory: Array<{
    categoryId: string;
    categoryName: string;
    totalRequests: number;
  }>;
  requestsByStatus: Array<{
    status: RequestStatus;
    totalRequests: number;
  }>;
  requestsByPriority: Array<{
    priority: RequestPriority;
    totalRequests: number;
  }>;
  requestsTrend: Array<{
    date: string;
    totalRequests: number;
    resolvedRequests: number;
  }>;
  requestsByCity: Array<{
    cityId: string;
    cityName: string;
    totalRequests: number;
  }>;
  topOrganizations: Array<{
    organizationId: string;
    organizationName: string;
    totalRequests: number;
  }>;
  recentRequests: Array<{
    id: string;
    title: string;
    status: RequestStatus;
    priority: RequestPriority;
    createdAt: string;
    categoryName: string | null;
    cityName: string | null;
    organizationName: string | null;
  }>;
}

export interface RequestFilters {
  page?: number;
  limit?: number;
  status?: RequestStatus | '';
  categoryId?: string;
  cityId?: string;
  districtId?: string;
  organizationId?: string;
}
