import { randomUUID } from 'crypto';

import jwt, { SignOptions } from 'jsonwebtoken';

import { env } from '../../config/env';
import { UserRole } from '../constants/roles';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
  organizationId?: string | null;
  tokenVersion: number;
}

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.jwt.secret, {
    algorithm: env.jwt.algorithm,
    expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'],
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
    jwtid: randomUUID(),
  });

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.jwt.secret, {
    algorithms: [env.jwt.algorithm],
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
  }) as AccessTokenPayload;
