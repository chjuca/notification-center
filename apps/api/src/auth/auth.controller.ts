import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiErrorResponse } from '../common/api-error-response.js';
import { AUTH_THROTTLE } from '../common/throttle.js';
import {
  accessTokenSchema,
  loginSchema,
  registeredUserSchema,
  registerSchema,
  type AccessToken,
  type LoginDto,
  type RegisterDto,
  type RegisteredUser,
} from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { Public } from './public.decorator.js';

@ApiTags('auth')
@ApiErrorResponse(429, 'Too many attempts. Try again in a minute')
@Throttle({ default: AUTH_THROTTLE })
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Create an account' })
  @ApiCreatedResponse({ standardSchema: registeredUserSchema })
  @ApiErrorResponse(400, 'Invalid email or password')
  @ApiErrorResponse(409, 'Email already registered')
  register(
    @Body({ schema: registerSchema }) dto: RegisterDto,
  ): Promise<RegisteredUser> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an access token' })
  @ApiOkResponse({ standardSchema: accessTokenSchema })
  @ApiErrorResponse(400, 'Malformed body')
  @ApiErrorResponse(401, 'Invalid credentials')
  login(@Body({ schema: loginSchema }) dto: LoginDto): Promise<AccessToken> {
    return this.authService.login(dto);
  }
}
