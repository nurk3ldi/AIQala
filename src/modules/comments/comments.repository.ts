import { CreationAttributes } from 'sequelize';

import { CommentModel } from '../../database/models';

export class CommentsRepository {
  create(payload: CreationAttributes<CommentModel>): Promise<CommentModel> {
    return CommentModel.create(payload);
  }
}
