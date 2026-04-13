import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TagsService } from './tags.service';
import { Tag } from './tag.entity';

const makeTag = (overrides: Partial<Tag> = {}): Tag =>
  ({
    id: 'tag-1',
    name: 'NestJS',
    slug: 'nestjs',
    userId: 'user-1',
    createdAt: new Date(),
    links: [],
    user: {} as never,
    ...overrides,
  }) as Tag;

describe('TagsService', () => {
  let service: TagsService;
  let tagRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    tagRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: getRepositoryToken(Tag), useValue: tagRepo },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a tag with a slugified name', async () => {
      tagRepo.findOne.mockResolvedValue(null);
      const tag = makeTag();
      tagRepo.create.mockReturnValue(tag);
      tagRepo.save.mockResolvedValue(tag);

      const result = await service.create({ name: 'NestJS' }, 'user-1');

      expect(tagRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'NestJS', slug: 'nestjs', userId: 'user-1' }),
      );
      expect(result.slug).toBe('nestjs');
    });

    it('slugifies names with spaces and uppercase', async () => {
      tagRepo.findOne.mockResolvedValue(null);
      const tag = makeTag({ name: 'My Tag', slug: 'my-tag' });
      tagRepo.create.mockReturnValue(tag);
      tagRepo.save.mockResolvedValue(tag);

      await service.create({ name: 'My Tag' }, 'user-1');

      expect(tagRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'my-tag' }),
      );
    });

    it('throws ConflictException when slug already exists for user', async () => {
      tagRepo.findOne.mockResolvedValue(makeTag());

      await expect(service.create({ name: 'NestJS' }, 'user-1')).rejects.toThrow(
        ConflictException,
      );
      expect(tagRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all tags for the given user', async () => {
      const tags = [makeTag(), makeTag({ id: 'tag-2', name: 'React', slug: 'react' })];
      tagRepo.find.mockResolvedValue(tags);

      const result = await service.findAll('user-1');

      expect(tagRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(result).toHaveLength(2);
    });

    it('returns empty array when user has no tags', async () => {
      tagRepo.find.mockResolvedValue([]);

      const result = await service.findAll('user-1');

      expect(result).toEqual([]);
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('removes the tag when owner matches', async () => {
      const tag = makeTag();
      tagRepo.findOne.mockResolvedValue(tag);
      tagRepo.remove.mockResolvedValue(undefined);

      await service.delete('tag-1', 'user-1');

      expect(tagRepo.remove).toHaveBeenCalledWith(tag);
    });

    it('throws NotFoundException when tag does not exist', async () => {
      tagRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('missing', 'user-1')).rejects.toThrow(NotFoundException);
      expect(tagRepo.remove).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when userId does not match', async () => {
      tagRepo.findOne.mockResolvedValue(makeTag({ userId: 'user-1' }));

      await expect(service.delete('tag-1', 'user-2')).rejects.toThrow(ForbiddenException);
      expect(tagRepo.remove).not.toHaveBeenCalled();
    });
  });
});
