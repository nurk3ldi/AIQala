import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

import { REQUEST_PRIORITIES, REQUEST_STATUSES, RequestPriority, RequestStatus } from '../../common/constants/request.constants';

export class IssueRequestModel extends Model<InferAttributes<IssueRequestModel>, InferCreationAttributes<IssueRequestModel>> {
  declare id: CreationOptional<string>;
  declare title: string;
  declare description: string;
  declare categoryId: ForeignKey<string>;
  declare cityId: ForeignKey<string>;
  declare districtId: ForeignKey<string> | null;
  declare latitude: string;
  declare longitude: string;
  declare status: CreationOptional<RequestStatus>;
  declare priority: CreationOptional<RequestPriority>;
  declare userId: ForeignKey<string>;
  declare organizationId: ForeignKey<string> | null;
  declare aiInsight: CreationOptional<Record<string, unknown> | null>;
  declare resolvedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initialize(sequelize: Sequelize): void {
    IssueRequestModel.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4,
        },
        title: {
          type: DataTypes.STRING(200),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        categoryId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'category_id',
          references: {
            model: 'categories',
            key: 'id',
          },
        },
        cityId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'city_id',
          references: {
            model: 'cities',
            key: 'id',
          },
        },
        districtId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'district_id',
          references: {
            model: 'districts',
            key: 'id',
          },
        },
        latitude: {
          type: DataTypes.DECIMAL(10, 7),
          allowNull: false,
        },
        longitude: {
          type: DataTypes.DECIMAL(10, 7),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM(...REQUEST_STATUSES),
          allowNull: false,
          defaultValue: RequestStatus.ACCEPTED,
        },
        priority: {
          type: DataTypes.ENUM(...REQUEST_PRIORITIES),
          allowNull: false,
          defaultValue: RequestPriority.MEDIUM,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'user_id',
          references: {
            model: 'users',
            key: 'id',
          },
        },
        organizationId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'organization_id',
          references: {
            model: 'organizations',
            key: 'id',
          },
        },
        aiInsight: {
          type: DataTypes.JSONB,
          allowNull: true,
          field: 'ai_insight',
        },
        resolvedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'resolved_at',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'created_at',
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'updated_at',
        },
      },
      {
        sequelize,
        tableName: 'requests',
        modelName: 'IssueRequest',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['user_id'],
          },
          {
            fields: ['organization_id'],
          },
          {
            fields: ['status'],
          },
          {
            fields: ['category_id'],
          },
          {
            fields: ['city_id'],
          },
          {
            fields: ['district_id'],
          },
        ],
      },
    );
  }
}
