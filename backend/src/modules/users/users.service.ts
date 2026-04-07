import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  create(data: {
    email: string;
    name: string;
    password?: string;
    googleId?: string;
  }): Promise<User> {
    const user = this.usersRepo.create({
      email: data.email,
      name: data.name,
      password: data.password ?? null,
      googleId: data.googleId ?? null,
    });
    return this.usersRepo.save(user);
  }

  async findOrCreateGoogleUser(data: {
    email: string;
    name: string;
    googleId: string;
  }): Promise<User> {
    // Look up by googleId first (returning user)
    let user = await this.usersRepo.findOne({
      where: { googleId: data.googleId },
    });
    if (user) return user;

    // Email exists as local account → merge by linking googleId
    user = await this.usersRepo.findOne({ where: { email: data.email } });
    if (user) {
      user.googleId = data.googleId;
      return this.usersRepo.save(user);
    }

    // New user via Google
    return this.create({
      email: data.email,
      name: data.name,
      googleId: data.googleId,
    });
  }
}
