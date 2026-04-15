import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { fileTypeFromBuffer } from 'file-type';
import { Op, Transaction } from 'sequelize';

import { ALLOWED_IMAGE_UPLOAD_MIME_TYPES } from '../../common/constants/upload.constants';
import { UserRole } from '../../common/constants/roles';
import { AppError } from '../../common/errors/app.error';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/query.util';
import { hashPassword } from '../../common/utils/password.util';
import { env } from '../../config/env';
import {
  CategoryModel,
  CityModel,
  DistrictModel,
  OrganizationModel,
  UserModel,
} from '../../database/models';
import { sequelize } from '../../database/sequelize';
import { AuthenticatedUser } from '../../types/auth';

import {
  CreateOrganizationAccountDto,
  CreateOrganizationDto,
  OrganizationListQueryDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';
import { OrganizationsRepository } from './organizations.repository';

export class OrganizationsService {
  constructor(private readonly organizationsRepository: OrganizationsRepository) {}

  async createOrganization(payload: CreateOrganizationDto) {
    await this.ensureLocationIntegrity(payload.cityId, payload.districtId);
    await this.ensureCategoriesExist(payload.categoryIds ?? []);

    const existingUser = await UserModel.findOne({
      where: {
        email: payload.account.email.toLowerCase(),
      },
    });

    if (existingUser) {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
    }

    const organization = await sequelize.transaction(async (transaction: Transaction) => {
      const createdOrganization = await this.organizationsRepository.createOrganization(
        {
          name: payload.name.trim(),
          description: payload.description?.trim() ?? null,
          cityId: payload.cityId,
          districtId: payload.districtId ?? null,
          address: payload.address.trim(),
          phone: payload.phone?.trim() ?? null,
        },
        transaction,
      );

      await this.organizationsRepository.createOrganizationUser(
        {
          fullName: payload.account.fullName.trim(),
          email: payload.account.email.toLowerCase(),
          passwordHash: await hashPassword(payload.account.password),
          role: UserRole.ORGANIZATION,
          organizationId: createdOrganization.id,
          tokenVersion: 0,
        },
        transaction,
      );

      await this.organizationsRepository.replaceCategories(createdOrganization.id, payload.categoryIds ?? [], transaction);

      return createdOrganization;
    });

    return this.organizationsRepository.findById(organization.id);
  }

  async listOrganizations(query: OrganizationListQueryDto) {
    const pagination = buildPagination(query.page, query.limit);
    const where: Record<string, unknown> = {};

    if (query.cityId) {
      where.cityId = query.cityId;
    }

    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    const result = await this.organizationsRepository.list({
      where,
      include: [
        {
          model: CityModel,
          as: 'city',
        },
        {
          model: DistrictModel,
          as: 'district',
        },
        {
          model: CategoryModel,
          as: 'categories',
          through: {
            attributes: [],
          },
          ...(query.categoryId
            ? {
                where: {
                  id: query.categoryId,
                },
              }
            : {}),
        },
        {
          model: UserModel,
          as: 'accounts',
          attributes: {
            exclude: ['passwordHash'],
          },
        },
      ],
      offset: pagination.offset,
      limit: pagination.limit,
      order: [['createdAt', 'DESC']],
    });

    return buildPaginatedResponse(result.rows, result.count, pagination.page, pagination.limit);
  }

  async getOrganizationById(id: string) {
    const organization = await this.organizationsRepository.findById(id);

    if (!organization) {
      throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found');
    }

    return organization;
  }

  async updateOrganization(id: string, payload: UpdateOrganizationDto) {
    const organization = await this.organizationsRepository.findByIdPlain(id);

    if (!organization) {
      throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found');
    }

    await this.ensureLocationIntegrity(payload.cityId ?? organization.cityId, payload.districtId ?? organization.districtId);

    if (payload.categoryIds) {
      await this.ensureCategoriesExist(payload.categoryIds);
    }

    await sequelize.transaction(async (transaction: Transaction) => {
      await organization.update(
        {
          name: payload.name?.trim() ?? organization.name,
          description: payload.description === undefined ? organization.description : payload.description?.trim() ?? null,
          cityId: payload.cityId ?? organization.cityId,
          districtId: payload.districtId === undefined ? organization.districtId : payload.districtId ?? null,
          address: payload.address?.trim() ?? organization.address,
          phone: payload.phone === undefined ? organization.phone : payload.phone?.trim() ?? null,
        },
        { transaction },
      );

      if (payload.categoryIds) {
        await this.organizationsRepository.replaceCategories(organization.id, payload.categoryIds, transaction);
      }
    });

    return this.organizationsRepository.findById(id);
  }

  async toggleActive(id: string, explicitValue?: boolean) {
    const organization = await this.organizationsRepository.findByIdPlain(id);

    if (!organization) {
      throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found');
    }

    const nextState = explicitValue ?? !organization.isActive;

    await sequelize.transaction(async (transaction: Transaction) => {
      await organization.update(
        {
          isActive: nextState,
        },
        { transaction },
      );

      await this.organizationsRepository.toggleUsersByOrganization(organization.id, nextState, transaction);
    });

    return this.organizationsRepository.findById(id);
  }

  async getMyOrganization(currentUser: AuthenticatedUser) {
    if (!currentUser.organizationId) {
      throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Organization account is not linked');
    }

    return this.getOrganizationById(currentUser.organizationId);
  }

  async listOrganizationAccounts(id: string) {
    await this.ensureOrganizationExists(id);

    return this.organizationsRepository.listAccountsByOrganization(id);
  }

  async createOrganizationAccount(id: string, payload: CreateOrganizationAccountDto) {
    await this.ensureOrganizationExists(id);

    const normalizedEmail = payload.email.toLowerCase();
    const existingUser = await UserModel.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
    }

    const account = await this.organizationsRepository.createOrganizationUser({
      fullName: payload.fullName.trim(),
      email: normalizedEmail,
      passwordHash: await hashPassword(payload.password),
      role: UserRole.ORGANIZATION,
      organizationId: id,
      isActive: true,
      tokenVersion: 0,
    });

    const serialized = account.toJSON() as Record<string, unknown>;
    delete serialized.passwordHash;

    return serialized;
  }

  async toggleOrganizationAccount(id: string, accountId: string, explicitValue?: boolean) {
    await this.ensureOrganizationExists(id);

    const account = await this.organizationsRepository.findOrganizationAccountById(id, accountId);

    if (!account || account.role !== UserRole.ORGANIZATION) {
      throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Organization account not found');
    }

    const nextState = explicitValue ?? !account.isActive;
    await account.update({
      isActive: nextState,
      tokenVersion: account.tokenVersion + 1,
    });

    const serialized = account.toJSON() as Record<string, unknown>;
    delete serialized.passwordHash;

    return serialized;
  }

  async updateLogo(id: string, file: Express.Multer.File | undefined) {
    const organization = await this.organizationsRepository.findByIdPlain(id);

    if (!organization) {
      throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found');
    }

    if (!file?.buffer?.length) {
      throw new AppError(400, 'FILE_REQUIRED', 'Organization image is required');
    }

    const detected = await fileTypeFromBuffer(file.buffer);

    if (!detected || !ALLOWED_IMAGE_UPLOAD_MIME_TYPES.includes(detected.mime as (typeof ALLOWED_IMAGE_UPLOAD_MIME_TYPES)[number])) {
      throw new AppError(400, 'INVALID_FILE_TYPE', 'Uploaded organization image content does not match an allowed format');
    }

    const previousLogoUrl = organization.logoUrl;
    const nextLogoUrl = await this.persistLogoFile(organization.id, file.buffer, detected.ext);

    try {
      await organization.update({
        logoUrl: nextLogoUrl,
      });

      await this.deleteManagedLogo(previousLogoUrl);

      return this.organizationsRepository.findById(id);
    } catch (error) {
      await this.deleteManagedLogo(nextLogoUrl);
      throw error;
    }
  }

  async deleteLogo(id: string) {
    const organization = await this.organizationsRepository.findByIdPlain(id);

    if (!organization) {
      throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found');
    }

    const previousLogoUrl = organization.logoUrl;

    if (!previousLogoUrl) {
      return this.organizationsRepository.findById(id);
    }

    await organization.update({
      logoUrl: null,
    });

    await this.deleteManagedLogo(previousLogoUrl);

    return this.organizationsRepository.findById(id);
  }

  private async ensureOrganizationExists(id: string): Promise<void> {
    const organization = await this.organizationsRepository.findByIdPlain(id);

    if (!organization) {
      throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found');
    }
  }

  private async ensureLocationIntegrity(cityId: string, districtId?: string | null): Promise<void> {
    const city = await CityModel.findByPk(cityId);

    if (!city) {
      throw new AppError(400, 'CITY_NOT_FOUND', 'City not found');
    }

    if (!districtId) {
      return;
    }

    const district = await DistrictModel.findOne({
      where: {
        id: districtId,
        cityId,
      },
    });

    if (!district) {
      throw new AppError(400, 'DISTRICT_NOT_FOUND', 'District does not belong to the provided city');
    }
  }

  private async ensureCategoriesExist(categoryIds: string[]): Promise<void> {
    if (categoryIds.length === 0) {
      return;
    }

    const categoriesCount = await CategoryModel.count({
      where: {
        id: {
          [Op.in]: categoryIds,
        },
      },
    });

    if (categoriesCount !== categoryIds.length) {
      throw new AppError(400, 'CATEGORY_NOT_FOUND', 'One or more categories do not exist');
    }
  }

  private async persistLogoFile(organizationId: string, fileBuffer: Buffer, extension: string): Promise<string> {
    const filename = `organization-${organizationId}-${randomUUID()}.${extension}`;
    const uploadRoot = path.resolve(process.cwd(), env.uploads.directory);
    const uploadPath = path.resolve(uploadRoot, filename);

    await fs.writeFile(uploadPath, fileBuffer, {
      flag: 'wx',
    });

    return `/${env.uploads.directory}/${filename}`;
  }

  private async deleteManagedLogo(fileUrl?: string | null): Promise<void> {
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
