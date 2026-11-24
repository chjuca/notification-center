import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../config/env.js';
import { UsersService } from '../users/users.service.js';
import type {
  AccessToken,
  JwtPayload,
  LoginDto,
  RegisterDto,
  RegisteredUser,
} from './auth.dto.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register({ email, password }: RegisterDto): Promise<RegisteredUser> {
    const passwordHash = await this.passwordService.hash(password);
    const user = await this.usersService.create(email, passwordHash);
    return { id: user.id, email: user.email };
  }

  async login({ email, password }: LoginDto): Promise<AccessToken> {
    const user = await this.usersService.findByEmailWithPassword(email);
    const passwordMatches =
      user !== null &&
      (await this.passwordService.verify(user.passwordHash, password));

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { sub: user.id };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.config.get('JWT_EXPIRES_IN_SECONDS', { infer: true }),
    };
  }
}
