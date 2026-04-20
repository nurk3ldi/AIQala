import { CreationAttributes } from 'sequelize';

import { CommentModel } from '../../database/models';

export class CommentsRepository {
  create(payload: CreationAttributes<CommentModel>): Promise<CommentModel> {
    return CommentModel.create(payload);
  }

  findById(id: string): Promise<CommentModel | null> {
    return CommentModel.findByPk(id);
  }

  async updateText(id: string, text: string): Promise<CommentModel | null> {
    const comment = await CommentModel.findByPk(id);

    if (!comment) {
      return null;
    }

    await comment.update({ text });
    return comment;
  }

  async removeById(id: string): Promise<boolean> {
    const deleted = await CommentModel.destroy({
      where: {
        id,
      },
    });

    return deleted > 0;
  }
}
