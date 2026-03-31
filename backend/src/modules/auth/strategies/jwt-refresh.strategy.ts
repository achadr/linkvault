import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/user.entity';

interface JwtPayload {
  sub: string;
  email: string;
}

const refreshCookieExtractor = (req: Request): string | null => {
  return req?.cookies?.refresh_token ?? null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([refreshCookieExtractor]),
      secretOrKey: process.env.JWT_REFRESH_SECRET as string,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
