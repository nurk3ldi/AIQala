import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class OrganizationModel extends Model<
  InferAttributes<OrganizationModel>,
  InferCreationAttributes<OrganizationModel>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare logoUrl: CreationOptional<string | null>;
  declare description: string | null;
  declare cityId: ForeignKey<string>;
  declare districtId: ForeignKey<string> | null;
  declare address: string;
  declare phone: string | null;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initialize(sequelize: Sequelize): void {
    OrganizationModel.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4,
        },
        name: {
          type: DataTypes.STRING(160),
          allowNull: false,
        },
        logoUrl: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'logo_url',
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
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
        address: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        phone: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'is_active',
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
        tableName: 'organizations',
        modelName: 'Organization',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['city_id'],
          },
          {
            fields: ['district_id'],
          },
          {
            fields: ['is_active'],
          },
        ],
      },
    );
  }
}
