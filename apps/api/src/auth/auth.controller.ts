import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  loginSchema,
  registerSchema,
  type AccessToken,
  type LoginDto,
  type RegisterDto,
  type RegisteredUser,
} from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { Public } from './public.decorator.js';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body({ schema: registerSchema }) dto: RegisterDto,
  ): Promise<RegisteredUser> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body({ schema: loginSchema }) dto: LoginDto): Promise<AccessToken> {
    return this.authService.login(dto);
  }
}
