import { UserRole } from '../../common/constants/roles';
import { AppError } from '../../common/errors/app.error';
import { signAccessToken } from '../../common/utils/jwt.util';
import { comparePassword, hashPassword } from '../../common/utils/password.util';

import { AuthAttemptsStore } from './auth-attempts.store';
import { AuthRepository } from './auth.repository';
import { LoginDto, RegisterDto } from './dto/auth.dto';

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authAttemptsStore: AuthAttemptsStore,
  ) {}

  async register(payload: RegisterDto) {
    const normalizedEmail = payload.email.toLowerCase();
    const existingUser = await this.authRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'A user with this email already exists');
    }

    const user = await this.authRepository.createUser({
      fullName: payload.fullName.trim(),
      email: normalizedEmail,
      passwordHash: await hashPassword(payload.password),
      role: UserRole.USER,
      tokenVersion: 0,
    });

    return this.buildAuthResponse(user);
  }

  async login(payload: LoginDto, ipAddress: string) {
    const normalizedEmail = payload.email.toLowerCase();
    const attemptKey = `${ipAddress}:${normalizedEmail}`;

    this.authAttemptsStore.assertNotLocked(attemptKey);

    const user = await this.authRepository.findByEmail(normalizedEmail);

    if (!user) {
      this.authAttemptsStore.registerFailure(attemptKey);
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }

    if (!user.isActive) {
      this.authAttemptsStore.registerFailure(attemptKey);
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }

    const passwordMatches = await comparePassword(payload.password, user.passwordHash);

    if (!passwordMatches) {
      this.authAttemptsStore.registerFailure(attemptKey);
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }

    this.authAttemptsStore.clear(attemptKey);

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
    role: UserRole;
    organizationId?: string | null;
    tokenVersion?: number;
  }) {
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      tokenVersion: user.tokenVersion ?? 0,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        role: user.role,
        organizationId: user.organizationId ?? null,
      },
    };
  }
}
