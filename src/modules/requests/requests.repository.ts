import { CreationAttributes, FindAndCountOptions, Includeable } from 'sequelize';

import {
  CategoryModel,
  CityModel,
  CommentModel,
  DistrictModel,
  IssueRequestModel,
  MediaModel,
  OrganizationModel,
  UserModel,
} from '../../database/models';

export class RequestsRepository {
  private getListIncludes(): Includeable[] {
    return [
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
      },
      {
        model: UserModel,
        as: 'requester',
        attributes: {
          exclude: ['passwordHash'],
        },
      },
    ];
  }

  private getDetailIncludes(): Includeable[] {
    return [
      ...this.getListIncludes(),
      {
        model: CommentModel,
        as: 'comments',
        include: [
          {
            model: UserModel,
            as: 'authorUser',
            attributes: {
              exclude: ['passwordHash'],
            },
          },
          {
            model: OrganizationModel,
            as: 'authorOrganization',
          },
        ],
      },
      {
        model: MediaModel,
        as: 'media',
        include: [
          {
            model: UserModel,
            as: 'uploadedByUser',
            attributes: {
              exclude: ['passwordHash'],
            },
          },
          {
            model: OrganizationModel,
            as: 'uploadedByOrganization',
          },
        ],
      },
    ];
  }

  create(payload: CreationAttributes<IssueRequestModel>): Promise<IssueRequestModel> {
    return IssueRequestModel.create(payload);
  }

  list(options: FindAndCountOptions<IssueRequestModel>) {
    return IssueRequestModel.findAndCountAll({
      ...options,
      include: options.include ?? this.getListIncludes(),
      distinct: true,
    });
  }

  findById(id: string, detailed = true): Promise<IssueRequestModel | null> {
    return IssueRequestModel.findByPk(id, {
      include: detailed ? this.getDetailIncludes() : this.getListIncludes(),
    });
  }

  findByIdPlain(id: string): Promise<IssueRequestModel | null> {
    return IssueRequestModel.findByPk(id);
  }
}
