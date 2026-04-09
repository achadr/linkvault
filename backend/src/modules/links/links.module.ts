import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from './link.entity';
import { Tag } from '../tags/tag.entity';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';
import { ScraperService } from './scraper.service';

@Module({
  imports: [TypeOrmModule.forFeature([Link, Tag])],
  controllers: [LinksController],
  providers: [LinksService, ScraperService],
})
export class LinksModule {}
