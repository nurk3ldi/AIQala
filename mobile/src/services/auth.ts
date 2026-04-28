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

type UserResponse = {
  success: boolean;
  data: AuthUser;
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

export async function uploadAvatar(
  token: string,
  file: {
    uri: string;
    name: string;
    type: string;
  },
): Promise<AuthUser> {
  const formData = new FormData();
  formData.append('avatar', file as unknown as Blob);

  const response = await apiRequest<UserResponse>('/users/me/avatar', {
    method: 'POST',
    body: formData,
    token,
  });

  return response.data;
}

export async function deleteAvatar(token: string): Promise<AuthUser> {
  const response = await apiRequest<UserResponse>('/users/me/avatar', {
    method: 'DELETE',
    token,
  });

  return response.data;
}

export async function updateProfile(token: string, payload: { fullName?: string; email?: string }): Promise<AuthUser> {
  const response = await apiRequest<UserResponse>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });

  return response.data;
}
