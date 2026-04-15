import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

import { MEDIA_TYPES, MediaType } from '../../common/constants/request.constants';

export class MediaModel extends Model<InferAttributes<MediaModel>, InferCreationAttributes<MediaModel>> {
  declare id: CreationOptional<string>;
  declare requestId: ForeignKey<string>;
  declare fileUrl: string;
  declare type: MediaType;
  declare uploadedByUserId: ForeignKey<string> | null;
  declare uploadedByOrganizationId: ForeignKey<string> | null;
  declare createdAt: CreationOptional<Date>;

  static initialize(sequelize: Sequelize): void {
    MediaModel.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4,
        },
        requestId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'request_id',
          references: {
            model: 'requests',
            key: 'id',
          },
        },
        fileUrl: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'file_url',
        },
        type: {
          type: DataTypes.ENUM(...MEDIA_TYPES),
          allowNull: false,
        },
        uploadedByUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'uploaded_by_user_id',
          references: {
            model: 'users',
            key: 'id',
          },
        },
        uploadedByOrganizationId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'uploaded_by_organization_id',
          references: {
            model: 'organizations',
            key: 'id',
          },
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'created_at',
        },
      },
      {
        sequelize,
        tableName: 'media',
        modelName: 'Media',
        underscored: true,
        timestamps: true,
        updatedAt: false,
        indexes: [
          {
            fields: ['request_id'],
          },
        ],
      },
    );
  }
}
