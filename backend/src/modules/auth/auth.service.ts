import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/user.entity';

export interface AuthResult {
  accessToken: string;
  user: Omit<User, 'password' | 'googleId'>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto, res: Response): Promise<AuthResult> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      password: hashed,
    });

    const accessToken = this.setTokenCookies(res, user);
    return this.toAuthResult(user, accessToken);
  }

  async login(dto: LoginDto, res: Response): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.setTokenCookies(res, user);
    return this.toAuthResult(user, accessToken);
  }

  private setTokenCookies(res: Response, user: User): string {
    const payload = { sub: user.id, email: user.email };
    const isProduction = process.env.NODE_ENV === 'production';

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return accessToken;
  }

  refresh(user: User, res: Response): AuthResult {
    const accessToken = this.setTokenCookies(res, user);
    return this.toAuthResult(user, accessToken);
  }

  loginWithGoogle(user: User, res: Response): string {
    const payload = { sub: user.id, email: user.email };
    const isProduction = process.env.NODE_ENV === 'production';

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return accessToken;
  }

  logout(res: Response): void {
    const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const };
    res.clearCookie('refresh_token', options);
  }

  private toAuthResult(user: User, accessToken: string): AuthResult {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, googleId, ...safeUser } = user;
    return { accessToken, user: safeUser };
  }
}
