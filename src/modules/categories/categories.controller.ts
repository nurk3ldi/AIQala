import { Request, Response } from 'express';

import { CategoriesService } from './categories.service';
import { CategoryOrganizationsQueryDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const category = await this.categoriesService.createCategory(request.body as CreateCategoryDto);

    response.status(201).json({
      success: true,
      data: category,
    });
  };

  list = async (_request: Request, response: Response): Promise<void> => {
    const categories = await this.categoriesService.listCategories();

    response.status(200).json({
      success: true,
      data: categories,
    });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const category = await this.categoriesService.getCategoryById(request.params.id as string);

    response.status(200).json({
      success: true,
      data: category,
    });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const category = await this.categoriesService.updateCategory(request.params.id as string, request.body as UpdateCategoryDto);

    response.status(200).json({
      success: true,
      data: category,
    });
  };

  delete = async (request: Request, response: Response): Promise<void> => {
    await this.categoriesService.deleteCategory(request.params.id as string);

    response.status(204).send();
  };

  bindOrganization = async (request: Request, response: Response): Promise<void> => {
    const result = await this.categoriesService.bindOrganization(
      request.params.id as string,
      request.params.organizationId as string,
    );

    response.status(201).json({
      success: true,
      data: result,
    });
  };

  listBoundOrganizations = async (request: Request, response: Response): Promise<void> => {
    const organizations = await this.categoriesService.listBoundOrganizations(
      request.params.id as string,
      request.query as unknown as CategoryOrganizationsQueryDto,
    );

    response.status(200).json({
      success: true,
      data: organizations,
    });
  };

  unbindOrganization = async (request: Request, response: Response): Promise<void> => {
    await this.categoriesService.unbindOrganization(
      request.params.id as string,
      request.params.organizationId as string,
    );

    response.status(204).send();
  };
}
