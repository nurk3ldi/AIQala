import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { fileTypeFromBuffer } from 'file-type';

import { ALLOWED_IMAGE_UPLOAD_MIME_TYPES } from '../../common/constants/upload.constants';
import { AppError } from '../../common/errors/app.error';
import { comparePassword, hashPassword } from '../../common/utils/password.util';
import { env } from '../../config/env';
import { UserModel } from '../../database/models';

import { UpdateProfileDto } from './dto/user.dto';
import { UsersRepository } from './users.repository';

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getProfile(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return this.serializeUser(user);
  }

  async updateProfile(userId: string, payload: UpdateProfileDto) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    if (payload.newPassword && !payload.currentPassword) {
      throw new AppError(400, 'CURRENT_PASSWORD_REQUIRED', 'Current password is required to set a new password');
    }

    const updatePayload: Partial<{
      fullName: string;
      email: string;
      passwordHash: string;
    }> = {};

    if (payload.fullName) {
      updatePayload.fullName = payload.fullName.trim();
    }

    if (payload.email) {
      const normalizedEmail = payload.email.toLowerCase();
      const emailOwner = await this.usersRepository.findByEmail(normalizedEmail);

      if (emailOwner && emailOwner.id !== user.id) {
        throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'A user with this email already exists');
      }

      updatePayload.email = normalizedEmail;
    }

    if (payload.currentPassword && payload.newPassword) {
      const isCurrentPasswordValid = await comparePassword(payload.currentPassword, user.passwordHash);

      if (!isCurrentPasswordValid) {
        throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
      }

      updatePayload.passwordHash = await hashPassword(payload.newPassword);
    }

    const updatedUser = await user.update({
      ...updatePayload,
      ...(payload.newPassword
        ? {
            tokenVersion: user.tokenVersion + 1,
          }
        : {}),
    });

    return this.serializeUser(updatedUser);
  }

  async updateAvatar(userId: string, file: Express.Multer.File | undefined) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    if (!file?.buffer?.length) {
      throw new AppError(400, 'FILE_REQUIRED', 'Profile image is required');
    }

    const detected = await fileTypeFromBuffer(file.buffer);

    if (!detected || !ALLOWED_IMAGE_UPLOAD_MIME_TYPES.includes(detected.mime as (typeof ALLOWED_IMAGE_UPLOAD_MIME_TYPES)[number])) {
      throw new AppError(400, 'INVALID_FILE_TYPE', 'Uploaded profile image content does not match an allowed format');
    }

    const previousAvatarUrl = user.avatarUrl;
    const nextAvatarUrl = await this.persistAvatarFile(user.id, file.buffer, detected.ext);

    try {
      const updatedUser = await user.update({
        avatarUrl: nextAvatarUrl,
      });

      await this.deleteManagedAvatar(previousAvatarUrl);

      return this.serializeUser(updatedUser);
    } catch (error) {
      await this.deleteManagedAvatar(nextAvatarUrl);
      throw error;
    }
  }

  async deleteAvatar(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const previousAvatarUrl = user.avatarUrl;

    if (!previousAvatarUrl) {
      return this.serializeUser(user);
    }

    const updatedUser = await user.update({
      avatarUrl: null,
    });

    await this.deleteManagedAvatar(previousAvatarUrl);

    return this.serializeUser(updatedUser);
  }

  private serializeUser(user: UserModel) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      organizationId: user.organizationId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async persistAvatarFile(userId: string, fileBuffer: Buffer, extension: string): Promise<string> {
    const filename = `avatar-${userId}-${randomUUID()}.${extension}`;
    const uploadRoot = path.resolve(process.cwd(), env.uploads.directory);
    const uploadPath = path.resolve(uploadRoot, filename);

    await fs.writeFile(uploadPath, fileBuffer, {
      flag: 'wx',
    });

    return `/${env.uploads.directory}/${filename}`;
  }

  private async deleteManagedAvatar(fileUrl?: string | null): Promise<void> {
    if (!fileUrl) {
      return;
    }

    const publicPrefix = `/${env.uploads.directory}/`;

    if (!fileUrl.startsWith(publicPrefix)) {
      return;
    }

    const uploadRoot = path.resolve(process.cwd(), env.uploads.directory);
    const targetPath = path.resolve(uploadRoot, path.basename(fileUrl));
    const relativePath = path.relative(uploadRoot, targetPath);

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return;
    }

    try {
      await fs.unlink(targetPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
