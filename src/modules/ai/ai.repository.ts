import {
  CategoryModel,
  CityModel,
  DistrictModel,
  IssueRequestModel,
  OrganizationModel,
} from '../../database/models';

export class AiRepository {
  getActiveCategories(): Promise<CategoryModel[]> {
    return CategoryModel.findAll({
      where: {
        isActive: true,
      },
      order: [['name', 'ASC']],
    });
  }

  getActiveOrganizations(): Promise<OrganizationModel[]> {
    return OrganizationModel.findAll({
      where: {
        isActive: true,
      },
      include: [
        {
          model: CategoryModel,
          as: 'categories',
          through: {
            attributes: [],
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
      ],
      order: [['name', 'ASC']],
    });
  }

  findRequestById(id: string): Promise<IssueRequestModel | null> {
    return IssueRequestModel.findByPk(id, {
      include: [
        {
          model: CategoryModel,
          as: 'category',
        },
        {
          model: CityModel,
          as: 'city',
        },
        {
          model: DistrictModel,
          as: 'district',
        },
        {
          model: OrganizationModel,
          as: 'organization',
          include: [
            {
              model: CategoryModel,
              as: 'categories',
              through: {
                attributes: [],
              },
            },
          ],
        },
      ],
    });
  }
}
