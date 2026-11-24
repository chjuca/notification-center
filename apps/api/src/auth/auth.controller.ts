import { Body, Controller, Post } from '@nestjs/common';
import {
  registerSchema,
  type RegisterDto,
  type RegisteredUser,
} from './auth.dto.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body({ schema: registerSchema }) dto: RegisterDto,
  ): Promise<RegisteredUser> {
    return this.authService.register(dto);
  }
}
