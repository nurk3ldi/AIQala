import { Request, Response } from 'express';

import { UpdateProfileDto } from './dto/user.dto';
import { UsersService } from './users.service';

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  getMe = async (request: Request, response: Response): Promise<void> => {
    const profile = await this.usersService.getProfile(request.user!.id);

    response.status(200).json({
      success: true,
      data: profile,
    });
  };

  updateMe = async (request: Request, response: Response): Promise<void> => {
    const profile = await this.usersService.updateProfile(request.user!.id, request.body as UpdateProfileDto);

    response.status(200).json({
      success: true,
      data: profile,
    });
  };

  uploadAvatar = async (request: Request, response: Response): Promise<void> => {
    const profile = await this.usersService.updateAvatar(request.user!.id, request.file);

    response.status(200).json({
      success: true,
      data: profile,
    });
  };

  deleteAvatar = async (request: Request, response: Response): Promise<void> => {
    const profile = await this.usersService.deleteAvatar(request.user!.id);

    response.status(200).json({
      success: true,
      data: profile,
    });
  };
}
