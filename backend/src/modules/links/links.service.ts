import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Link } from './link.entity';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { ScraperService } from './scraper.service';

const PAGE_SIZE = 20;

interface FindAllOptions {
  page?: number;
  archived?: boolean;
  q?: string;
  tag?: string;
}

export interface PaginatedLinks {
  data: Link[];
  total: number;
  page: number;
}

@Injectable()
export class LinksService {
  constructor(
    @InjectRepository(Link)
    private readonly linkRepo: Repository<Link>,
    private readonly scraper: ScraperService,
  ) {}

  async create(dto: CreateLinkDto, userId: string): Promise<Link> {
    const scraped = await this.scraper.scrape(dto.url);

    const link = this.linkRepo.create({
      url: dto.url,
      title: scraped.title,
      description: dto.description ?? scraped.description,
      userId,
    });

    const saved = await this.linkRepo.save(link);
    return (await this.linkRepo.findOne({
      where: { id: saved.id },
      relations: ['tags'],
    }))!;
  }

  async findAll(
    userId: string,
    { page = 1, archived = false, q, tag }: FindAllOptions,
  ): Promise<PaginatedLinks> {
    const qb = this.linkRepo
      .createQueryBuilder('link')
      .leftJoinAndSelect('link.tags', 'tag')
      .where('link.userId = :userId', { userId });

    if (archived) {
      qb.andWhere('link.archivedAt IS NOT NULL');
    } else {
      qb.andWhere('link.archivedAt IS NULL');
    }

    if (q) {
      qb.andWhere(
        '(link.title ILIKE :q OR link.description ILIKE :q)',
        { q: `%${q}%` },
      );
    }

    if (tag) {
      qb.andWhere('tag.slug = :tag', { tag });
    }

    qb.orderBy('link.createdAt', 'DESC')
      .skip((page - 1) * PAGE_SIZE)
      .take(PAGE_SIZE);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page };
  }

  async findOne(id: string, userId: string): Promise<Link> {
    const link = await this.linkRepo.findOne({
      where: { id },
      relations: ['tags'],
    });
    if (!link) throw new NotFoundException('Link not found');
    if (link.userId !== userId) throw new ForbiddenException();
    return link;
  }

  async update(id: string, dto: UpdateLinkDto, userId: string): Promise<Link> {
    const link = await this.findOne(id, userId);

    if (dto.url && dto.url !== link.url) {
      const scraped = await this.scraper.scrape(dto.url);
      link.url = dto.url;
      link.title = dto.title ?? scraped.title;
      link.description = dto.description ?? scraped.description;
    } else {
      if (dto.url) link.url = dto.url;
      if (dto.title !== undefined) link.title = dto.title;
      if (dto.description !== undefined) link.description = dto.description;
    }

    return this.linkRepo.save(link);
  }

  async archive(id: string, userId: string): Promise<Link> {
    const link = await this.findOne(id, userId);
    link.archivedAt = new Date();
    return this.linkRepo.save(link);
  }

  async remove(id: string, userId: string): Promise<void> {
    const link = await this.findOne(id, userId);
    await this.linkRepo.remove(link);
  }
}
