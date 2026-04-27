import { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.register(request.body as RegisterDto);

    response.status(201).json({
      success: true,
      data: result,
    });
  };

  login = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.login(request.body as LoginDto, request.ip ?? request.socket.remoteAddress ?? 'unknown');

    response.status(200).json({
      success: true,
      data: result,
    });
  };

  mobileLogin = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.loginMobileUser(
      request.body as LoginDto,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );

    response.status(200).json({
      success: true,
      data: result,
    });
  };
}
