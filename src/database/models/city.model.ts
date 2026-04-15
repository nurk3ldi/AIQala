import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class CityModel extends Model<InferAttributes<CityModel>, InferCreationAttributes<CityModel>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare region: string | null;
  declare latitude: string | null;
  declare longitude: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initialize(sequelize: Sequelize): void {
    CityModel.init(
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
          unique: true,
        },
        region: {
          type: DataTypes.STRING(120),
          allowNull: true,
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
        tableName: 'cities',
        modelName: 'City',
        underscored: true,
        timestamps: true,
      },
    );
  }
}
