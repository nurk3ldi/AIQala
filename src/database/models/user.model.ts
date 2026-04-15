import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

import { ALL_ROLES, UserRole } from '../../common/constants/roles';

export class UserModel extends Model<InferAttributes<UserModel>, InferCreationAttributes<UserModel>> {
  declare id: CreationOptional<string>;
  declare fullName: string;
  declare email: string;
  declare passwordHash: string;
  declare avatarUrl: CreationOptional<string | null>;
  declare role: UserRole;
  declare organizationId: ForeignKey<string> | null;
  declare isActive: CreationOptional<boolean>;
  declare tokenVersion: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initialize(sequelize: Sequelize): void {
    UserModel.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4,
        },
        fullName: {
          type: DataTypes.STRING(120),
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(160),
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true,
          },
        },
        passwordHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'password_hash',
        },
        avatarUrl: {
          type: DataTypes.STRING(255),
          allowNull: true,
          defaultValue: null,
          field: 'avatar_url',
        },
        role: {
          type: DataTypes.ENUM(...ALL_ROLES),
          allowNull: false,
          defaultValue: UserRole.USER,
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
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'is_active',
        },
        tokenVersion: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'token_version',
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
        tableName: 'users',
        modelName: 'User',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['email'],
            unique: true,
          },
          {
            fields: ['role'],
          },
          {
            fields: ['organization_id'],
          },
          {
            fields: ['token_version'],
          },
        ],
      },
    );
  }
}
