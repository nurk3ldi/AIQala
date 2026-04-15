import { AppError } from '../../common/errors/app.error';
import { env } from '../../config/env';

interface AttemptState {
  count: number;
  firstAttemptAt: number;
  lockUntil: number | null;
}

export class AuthAttemptsStore {
  private readonly attempts = new Map<string, AttemptState>();

  assertNotLocked(key: string): void {
    this.cleanup(key);

    const state = this.attempts.get(key);

    if (!state?.lockUntil) {
      return;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((state.lockUntil - Date.now()) / 1000));

    throw new AppError(429, 'AUTH_LOCKED', 'Too many failed login attempts, please try again later', {
      retryAfterSeconds,
    });
  }

  registerFailure(key: string): void {
    this.cleanup(key);

    const now = Date.now();
    const current = this.attempts.get(key);

    if (!current || now - current.firstAttemptAt > env.security.authLock.windowMs) {
      this.attempts.set(key, {
        count: 1,
        firstAttemptAt: now,
        lockUntil: null,
      });
      return;
    }

    const nextCount = current.count + 1;
    const lockUntil = nextCount >= env.security.authLock.maxAttempts ? now + env.security.authLock.lockMs : null;

    this.attempts.set(key, {
      count: nextCount,
      firstAttemptAt: current.firstAttemptAt,
      lockUntil,
    });
  }

  clear(key: string): void {
    this.attempts.delete(key);
  }

  private cleanup(key: string): void {
    const current = this.attempts.get(key);

    if (!current) {
      return;
    }

    const now = Date.now();

    if (current.lockUntil && current.lockUntil <= now) {
      this.attempts.delete(key);
      return;
    }

    if (!current.lockUntil && now - current.firstAttemptAt > env.security.authLock.windowMs) {
      this.attempts.delete(key);
    }
  }
}
