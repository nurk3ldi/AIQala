import { AppError } from '../../common/errors/app.error';
import { OrganizationModel } from '../../database/models';

import { CategoriesRepository } from './categories.repository';
import { CategoryOrganizationsQueryDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async createCategory(payload: CreateCategoryDto) {
    const existingCategory = await this.categoriesRepository.findByName(payload.name.trim());

    if (existingCategory) {
      throw new AppError(409, 'CATEGORY_EXISTS', 'A category with this name already exists');
    }

    return this.categoriesRepository.create({
      name: payload.name.trim(),
      description: payload.description?.trim() ?? null,
    });
  }

  listCategories() {
    return this.categoriesRepository.findAll();
  }

  async getCategoryById(id: string) {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    return category;
  }

  async updateCategory(id: string, payload: UpdateCategoryDto) {
    const category = await this.getCategoryById(id);

    if (payload.name && payload.name.trim() !== category.name) {
      const existingCategory = await this.categoriesRepository.findByName(payload.name.trim());

      if (existingCategory && existingCategory.id !== category.id) {
        throw new AppError(409, 'CATEGORY_EXISTS', 'A category with this name already exists');
      }
    }

    return category.update({
      name: payload.name?.trim() ?? category.name,
      description: payload.description === undefined ? category.description : payload.description?.trim() ?? null,
    });
  }

  async deleteCategory(id: string) {
    const category = await this.getCategoryById(id);
    await category.destroy();
  }

  async bindOrganization(categoryId: string, organizationId: string) {
    await this.getCategoryById(categoryId);

    const organization = await OrganizationModel.findByPk(organizationId);

    if (!organization) {
      throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found');
    }

    return this.categoriesRepository.bindOrganization(categoryId, organizationId);
  }

  async listBoundOrganizations(categoryId: string, query: CategoryOrganizationsQueryDto) {
    await this.getCategoryById(categoryId);

    return this.categoriesRepository.listBoundOrganizations(categoryId, {
      cityId: query.cityId,
      isActive: query.isActive,
    });
  }

  async unbindOrganization(categoryId: string, organizationId: string) {
    await this.getCategoryById(categoryId);

    const organization = await OrganizationModel.findByPk(organizationId);

    if (!organization) {
      throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found');
    }

    const removed = await this.categoriesRepository.unbindOrganization(categoryId, organizationId);

    if (!removed) {
      throw new AppError(404, 'CATEGORY_NOT_ASSIGNED', 'Organization is not linked to this category');
    }
  }
}
