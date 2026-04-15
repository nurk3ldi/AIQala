import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class OrganizationCategoryModel extends Model<
  InferAttributes<OrganizationCategoryModel>,
  InferCreationAttributes<OrganizationCategoryModel>
> {
  declare id: CreationOptional<string>;
  declare organizationId: ForeignKey<string>;
  declare categoryId: ForeignKey<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initialize(sequelize: Sequelize): void {
    OrganizationCategoryModel.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4,
        },
        organizationId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'organization_id',
          references: {
            model: 'organizations',
            key: 'id',
          },
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
        tableName: 'organization_categories',
        modelName: 'OrganizationCategory',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ['organization_id', 'category_id'],
          },
        ],
      },
    );
  }
}
