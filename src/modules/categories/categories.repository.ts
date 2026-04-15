import { FindOptions } from 'sequelize';

import { CategoryModel, CityModel, DistrictModel, OrganizationCategoryModel, OrganizationModel } from '../../database/models';

export class CategoriesRepository {
  create(payload: Partial<CategoryModel>): Promise<CategoryModel> {
    return CategoryModel.create(payload as never);
  }

  findAll(): Promise<CategoryModel[]> {
    return CategoryModel.findAll({
      order: [['name', 'ASC']],
    });
  }

  findById(id: string): Promise<CategoryModel | null> {
    return CategoryModel.findByPk(id);
  }

  findByName(name: string): Promise<CategoryModel | null> {
    return CategoryModel.findOne({
      where: {
        name,
      },
    });
  }

  async bindOrganization(categoryId: string, organizationId: string): Promise<OrganizationCategoryModel> {
    const [binding] = await OrganizationCategoryModel.findOrCreate({
      where: {
        categoryId,
        organizationId,
      },
      defaults: {
        categoryId,
        organizationId,
      },
    });

    return binding;
  }

  listBoundOrganizations(categoryId: string, query?: { cityId?: string; isActive?: boolean }): Promise<OrganizationModel[]> {
    const where: Record<string, unknown> = {};

    if (query?.cityId) {
      where.cityId = query.cityId;
    }

    if (typeof query?.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    const include: FindOptions['include'] = [
      {
        model: CategoryModel,
        as: 'categories',
        through: {
          attributes: [],
        },
        where: {
          id: categoryId,
        },
      },
      {
        model: CityModel,
        as: 'city',
      },
      {
        model: DistrictModel,
        as: 'district',
      },
    ];

    return OrganizationModel.findAll({
      where,
      include,
      order: [
        ['name', 'ASC'],
        [{ model: CityModel, as: 'city' }, 'name', 'ASC'],
      ],
    });
  }

  unbindOrganization(categoryId: string, organizationId: string): Promise<number> {
    return OrganizationCategoryModel.destroy({
      where: {
        categoryId,
        organizationId,
      },
    });
  }
}
