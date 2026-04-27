import { apiRequest } from './api';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: 'admin' | 'organization' | 'user';
  organizationId: string | null;
};

export type AuthResult = {
  accessToken: string;
  user: AuthUser;
};

type AuthResponse = {
  success: boolean;
  data: AuthResult;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  fullName: string;
};

function assertRegularUser(result: AuthResult): AuthResult {
  if (result.user.role !== 'user' || result.user.organizationId) {
    throw new Error('Мобильное приложение доступно только обычным пользователям');
  }

  return result;
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const response = await apiRequest<AuthResponse>('/auth/mobile/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return assertRegularUser(response.data);
}

export async function register(payload: RegisterPayload): Promise<AuthResult> {
  const response = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return assertRegularUser(response.data);
}
