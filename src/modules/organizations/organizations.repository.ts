import { CreationAttributes, FindAndCountOptions, Includeable, Transaction, literal } from 'sequelize';

import {
  CategoryModel,
  CityModel,
  DistrictModel,
  OrganizationCategoryModel,
  OrganizationModel,
  UserModel,
} from '../../database/models';

export class OrganizationsRepository {
  readonly baseIncludes: Includeable[] = [
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
    },
    {
      model: UserModel,
      as: 'accounts',
      attributes: {
        exclude: ['passwordHash'],
      },
    },
  ];

  createOrganization(payload: CreationAttributes<OrganizationModel>, transaction?: Transaction): Promise<OrganizationModel> {
    return OrganizationModel.create(payload, { transaction });
  }

  createOrganizationUser(payload: CreationAttributes<UserModel>, transaction?: Transaction): Promise<UserModel> {
    return UserModel.create(payload, { transaction });
  }

  async replaceCategories(organizationId: string, categoryIds: string[], transaction?: Transaction): Promise<void> {
    await OrganizationCategoryModel.destroy({
      where: {
        organizationId,
      },
      transaction,
    });

    if (categoryIds.length === 0) {
      return;
    }

    await OrganizationCategoryModel.bulkCreate(
      categoryIds.map((categoryId) => ({
        organizationId,
        categoryId,
      })),
      { transaction },
    );
  }

  findById(id: string): Promise<OrganizationModel | null> {
    return OrganizationModel.findByPk(id, {
      include: this.baseIncludes,
    });
  }

  findByIdPlain(id: string): Promise<OrganizationModel | null> {
    return OrganizationModel.findByPk(id);
  }

  list(options: FindAndCountOptions<OrganizationModel>): Promise<{ rows: OrganizationModel[]; count: number }> {
    return OrganizationModel.findAndCountAll({
      ...options,
      include: options.include ?? this.baseIncludes,
      distinct: true,
    });
  }

  toggleUsersByOrganization(organizationId: string, isActive: boolean, transaction?: Transaction): Promise<[number]> {
    return UserModel.update(
      {
        isActive,
        tokenVersion: literal('token_version + 1') as unknown as number,
      },
      {
        where: {
          organizationId,
        },
        transaction,
      },
    );
  }

  listAccountsByOrganization(organizationId: string): Promise<UserModel[]> {
    return UserModel.findAll({
      where: {
        organizationId,
      },
      attributes: {
        exclude: ['passwordHash'],
      },
      order: [['createdAt', 'ASC']],
    });
  }

  findOrganizationAccountById(organizationId: string, accountId: string): Promise<UserModel | null> {
    return UserModel.findOne({
      where: {
        id: accountId,
        organizationId,
      },
    });
  }
}
