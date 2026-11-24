import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import type { RegisterDto, RegisteredUser } from './auth.dto.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
  ) {}

  async register({ email, password }: RegisterDto): Promise<RegisteredUser> {
    const passwordHash = await this.passwordService.hash(password);
    const user = await this.usersService.create(email, passwordHash);
    return { id: user.id, email: user.email };
  }
}
