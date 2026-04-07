import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import slugify from 'slugify';
import { Tag } from './tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
  ) {}

  async create(dto: CreateTagDto, userId: string): Promise<Tag> {
    const slug = slugify(dto.name, { lower: true, strict: true });

    const existing = await this.tagRepo.findOne({ where: { slug, userId } });
    if (existing) {
      throw new ConflictException(`Tag with slug "${slug}" already exists`);
    }

    const tag = this.tagRepo.create({ name: dto.name, slug, userId });
    return this.tagRepo.save(tag);
  }

  findAll(userId: string): Promise<Tag[]> {
    return this.tagRepo.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const tag = await this.tagRepo.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    if (tag.userId !== userId) {
      throw new ForbiddenException();
    }
    await this.tagRepo.remove(tag);
  }
}
