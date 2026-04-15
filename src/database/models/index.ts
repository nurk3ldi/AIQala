import { Sequelize } from 'sequelize';

import { CategoryModel } from './category.model';
import { CityModel } from './city.model';
import { CommentModel } from './comment.model';
import { DistrictModel } from './district.model';
import { MediaModel } from './media.model';
import { NotificationModel } from './notification.model';
import { OrganizationCategoryModel } from './organization-category.model';
import { OrganizationModel } from './organization.model';
import { IssueRequestModel } from './request.model';
import { UserModel } from './user.model';

let initialized = false;

export const initModels = (sequelize: Sequelize): void => {
  if (initialized) {
    return;
  }

  UserModel.initialize(sequelize);
  OrganizationModel.initialize(sequelize);
  CategoryModel.initialize(sequelize);
  CityModel.initialize(sequelize);
  DistrictModel.initialize(sequelize);
  IssueRequestModel.initialize(sequelize);
  CommentModel.initialize(sequelize);
  MediaModel.initialize(sequelize);
  NotificationModel.initialize(sequelize);
  OrganizationCategoryModel.initialize(sequelize);

  CityModel.hasMany(DistrictModel, {
    foreignKey: 'cityId',
    as: 'districts',
  });
  DistrictModel.belongsTo(CityModel, {
    foreignKey: 'cityId',
    as: 'city',
  });

  CityModel.hasMany(IssueRequestModel, {
    foreignKey: 'cityId',
    as: 'requests',
  });
  DistrictModel.hasMany(IssueRequestModel, {
    foreignKey: 'districtId',
    as: 'requests',
  });
  CityModel.hasMany(OrganizationModel, {
    foreignKey: 'cityId',
    as: 'organizations',
  });
  DistrictModel.hasMany(OrganizationModel, {
    foreignKey: 'districtId',
    as: 'organizations',
  });
  OrganizationModel.belongsTo(CityModel, {
    foreignKey: 'cityId',
    as: 'city',
  });
  OrganizationModel.belongsTo(DistrictModel, {
    foreignKey: 'districtId',
    as: 'district',
  });

  CategoryModel.hasMany(IssueRequestModel, {
    foreignKey: 'categoryId',
    as: 'requests',
  });
  IssueRequestModel.belongsTo(CategoryModel, {
    foreignKey: 'categoryId',
    as: 'category',
  });

  UserModel.hasMany(IssueRequestModel, {
    foreignKey: 'userId',
    as: 'requests',
  });
  IssueRequestModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'requester',
  });

  OrganizationModel.hasMany(IssueRequestModel, {
    foreignKey: 'organizationId',
    as: 'requests',
  });
  IssueRequestModel.belongsTo(OrganizationModel, {
    foreignKey: 'organizationId',
    as: 'organization',
  });

  IssueRequestModel.belongsTo(CityModel, {
    foreignKey: 'cityId',
    as: 'city',
  });
  IssueRequestModel.belongsTo(DistrictModel, {
    foreignKey: 'districtId',
    as: 'district',
  });

  IssueRequestModel.hasMany(CommentModel, {
    foreignKey: 'requestId',
    as: 'comments',
  });
  CommentModel.belongsTo(IssueRequestModel, {
    foreignKey: 'requestId',
    as: 'request',
  });

  IssueRequestModel.hasMany(MediaModel, {
    foreignKey: 'requestId',
    as: 'media',
  });
  MediaModel.belongsTo(IssueRequestModel, {
    foreignKey: 'requestId',
    as: 'request',
  });

  UserModel.hasMany(NotificationModel, {
    foreignKey: 'userId',
    as: 'notifications',
  });
  NotificationModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user',
  });

  UserModel.belongsTo(OrganizationModel, {
    foreignKey: 'organizationId',
    as: 'organization',
  });
  OrganizationModel.hasMany(UserModel, {
    foreignKey: 'organizationId',
    as: 'accounts',
  });

  CommentModel.belongsTo(UserModel, {
    foreignKey: 'authorUserId',
    as: 'authorUser',
  });
  CommentModel.belongsTo(OrganizationModel, {
    foreignKey: 'authorOrganizationId',
    as: 'authorOrganization',
  });
  OrganizationModel.hasMany(CommentModel, {
    foreignKey: 'authorOrganizationId',
    as: 'comments',
  });
  UserModel.hasMany(CommentModel, {
    foreignKey: 'authorUserId',
    as: 'comments',
  });

  MediaModel.belongsTo(UserModel, {
    foreignKey: 'uploadedByUserId',
    as: 'uploadedByUser',
  });
  MediaModel.belongsTo(OrganizationModel, {
    foreignKey: 'uploadedByOrganizationId',
    as: 'uploadedByOrganization',
  });
  OrganizationModel.hasMany(MediaModel, {
    foreignKey: 'uploadedByOrganizationId',
    as: 'media',
  });
  UserModel.hasMany(MediaModel, {
    foreignKey: 'uploadedByUserId',
    as: 'media',
  });

  CategoryModel.belongsToMany(OrganizationModel, {
    through: OrganizationCategoryModel,
    foreignKey: 'categoryId',
    otherKey: 'organizationId',
    as: 'organizations',
  });
  OrganizationModel.belongsToMany(CategoryModel, {
    through: OrganizationCategoryModel,
    foreignKey: 'organizationId',
    otherKey: 'categoryId',
    as: 'categories',
  });

  initialized = true;
};

export {
  UserModel,
  OrganizationModel,
  CategoryModel,
  CityModel,
  DistrictModel,
  IssueRequestModel,
  CommentModel,
  MediaModel,
  NotificationModel,
  OrganizationCategoryModel,
};
