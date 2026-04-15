import { UserRole } from '../common/constants/roles';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string | null;
}
