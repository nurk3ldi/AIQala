import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class DistrictModel extends Model<InferAttributes<DistrictModel>, InferCreationAttributes<DistrictModel>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare cityId: ForeignKey<string>;
  declare latitude: string | null;
  declare longitude: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initialize(sequelize: Sequelize): void {
    DistrictModel.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4,
        },
        name: {
          type: DataTypes.STRING(120),
          allowNull: false,
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
        latitude: {
          type: DataTypes.DECIMAL(10, 7),
          allowNull: true,
        },
        longitude: {
          type: DataTypes.DECIMAL(10, 7),
          allowNull: true,
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
        tableName: 'districts',
        modelName: 'District',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ['name', 'city_id'],
          },
        ],
      },
    );
  }
}
