import { CreationAttributes } from 'sequelize';

import { MediaModel } from '../../database/models';

export class MediaRepository {
  create(payload: CreationAttributes<MediaModel>): Promise<MediaModel> {
    return MediaModel.create(payload);
  }

  countUserMediaByRequest(requestId: string, userId: string): Promise<number> {
    return MediaModel.count({
      where: {
        requestId,
        uploadedByUserId: userId,
      },
    });
  }
}
