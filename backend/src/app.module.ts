import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './modules/users/user.entity';
import { Link } from './modules/links/link.entity';
import { Tag } from './modules/tags/tag.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [User, Link, Tag],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        ssl: process.env.DATABASE_URL?.includes('sslmode=require')
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
