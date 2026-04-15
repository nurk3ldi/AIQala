import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class CommentModel extends Model<InferAttributes<CommentModel>, InferCreationAttributes<CommentModel>> {
  declare id: CreationOptional<string>;
  declare requestId: ForeignKey<string>;
  declare authorUserId: ForeignKey<string> | null;
  declare authorOrganizationId: ForeignKey<string> | null;
  declare text: string;
  declare createdAt: CreationOptional<Date>;

  static initialize(sequelize: Sequelize): void {
    CommentModel.init(
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
        authorUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'author_user_id',
          references: {
            model: 'users',
            key: 'id',
          },
        },
        authorOrganizationId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'author_organization_id',
          references: {
            model: 'organizations',
            key: 'id',
          },
        },
        text: {
          type: DataTypes.TEXT,
          allowNull: false,
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
        tableName: 'comments',
        modelName: 'Comment',
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
