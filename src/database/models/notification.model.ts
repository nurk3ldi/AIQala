import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class NotificationModel extends Model<
  InferAttributes<NotificationModel>,
  InferCreationAttributes<NotificationModel>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string>;
  declare type: string;
  declare title: string;
  declare message: string;
  declare isRead: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;

  static initialize(sequelize: Sequelize): void {
    NotificationModel.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4,
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
        type: {
          type: DataTypes.STRING(80),
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING(180),
          allowNull: false,
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        isRead: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_read',
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
        tableName: 'notifications',
        modelName: 'Notification',
        underscored: true,
        timestamps: true,
        updatedAt: false,
        indexes: [
          {
            fields: ['user_id'],
          },
          {
            fields: ['is_read'],
          },
        ],
      },
    );
  }
}
