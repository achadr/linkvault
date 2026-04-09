import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LinksService } from './links.service';
import { ScraperService } from './scraper.service';
import { Link } from './link.entity';

const makeLink = (overrides: Partial<Link> = {}): Link =>
  ({
    id: 'link-1',
    url: 'https://example.com',
    title: 'Example',
    description: 'Desc',
    userId: 'user-1',
    createdAt: new Date(),
    archivedAt: null,
    tags: [],
    user: {} as never,
    ...overrides,
  }) as Link;

const makeQb = (results: [Link[], number] = [[], 0]) => {
  const qb: Record<string, jest.Mock> = {};
  const chain = [
    'leftJoinAndSelect',
    'where',
    'andWhere',
    'orderBy',
    'skip',
    'take',
  ];
  chain.forEach((m) => {
    qb[m] = jest.fn().mockReturnValue(qb);
  });
  qb['getManyAndCount'] = jest.fn().mockResolvedValue(results);
  return qb;
};

describe('LinksService', () => {
  let service: LinksService;
  let linkRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let scraper: { scrape: jest.Mock };

  beforeEach(async () => {
    linkRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    scraper = { scrape: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: getRepositoryToken(Link), useValue: linkRepo },
        { provide: ScraperService, useValue: scraper },
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('scrapes OG tags and saves the link', async () => {
      scraper.scrape.mockResolvedValue({ title: 'OG Title', description: 'OG Desc' });
      const link = makeLink({ title: 'OG Title', description: 'OG Desc' });
      linkRepo.create.mockReturnValue(link);
      linkRepo.save.mockResolvedValue(link);

      const result = await service.create({ url: 'https://example.com' }, 'user-1');

      expect(scraper.scrape).toHaveBeenCalledWith('https://example.com');
      expect(linkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://example.com', userId: 'user-1', title: 'OG Title' }),
      );
      expect(result.title).toBe('OG Title');
    });

    it('uses explicit description over scraped one', async () => {
      scraper.scrape.mockResolvedValue({ title: 'OG Title', description: 'OG Desc' });
      const link = makeLink({ description: 'User override' });
      linkRepo.create.mockReturnValue(link);
      linkRepo.save.mockResolvedValue(link);

      await service.create({ url: 'https://example.com', description: 'User override' }, 'user-1');

      expect(linkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'User override' }),
      );
    });

    it('stores null title/description when scraper fails', async () => {
      scraper.scrape.mockResolvedValue({ title: null, description: null });
      const link = makeLink({ title: null, description: null });
      linkRepo.create.mockReturnValue(link);
      linkRepo.save.mockResolvedValue(link);

      const result = await service.create({ url: 'https://example.com' }, 'user-1');

      expect(result.title).toBeNull();
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated result filtered by userId', async () => {
      const links = [makeLink()];
      const qb = makeQb([links, 1]);
      linkRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('user-1', { page: 1 });

      expect(result).toEqual({ data: links, total: 1, page: 1 });
      expect(qb.where).toHaveBeenCalledWith('link.userId = :userId', { userId: 'user-1' });
    });

    it('filters archived links when archived=true', async () => {
      const qb = makeQb([[], 0]);
      linkRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1', { archived: true });

      expect(qb.andWhere).toHaveBeenCalledWith('link.archivedAt IS NOT NULL');
    });

    it('filters active links by default', async () => {
      const qb = makeQb([[], 0]);
      linkRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1', {});

      expect(qb.andWhere).toHaveBeenCalledWith('link.archivedAt IS NULL');
    });

    it('applies ILIKE search when q is provided', async () => {
      const qb = makeQb([[], 0]);
      linkRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1', { q: 'nest' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(link.title ILIKE :q OR link.description ILIKE :q)',
        { q: '%nest%' },
      );
    });

    it('filters by tag slug when tag is provided', async () => {
      const qb = makeQb([[], 0]);
      linkRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1', { tag: 'nestjs' });

      expect(qb.andWhere).toHaveBeenCalledWith('tag.slug = :tag', { tag: 'nestjs' });
    });

    it('defaults to page 1 and applies correct skip/take', async () => {
      const qb = makeQb([[], 0]);
      linkRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1', {});

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the link when owner matches', async () => {
      const link = makeLink();
      linkRepo.findOne.mockResolvedValue(link);

      const result = await service.findOne('link-1', 'user-1');

      expect(result).toBe(link);
    });

    it('throws NotFoundException when link does not exist', async () => {
      linkRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when userId does not match', async () => {
      linkRepo.findOne.mockResolvedValue(makeLink({ userId: 'user-1' }));

      await expect(service.findOne('link-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates fields without re-scraping when url is unchanged', async () => {
      const link = makeLink();
      linkRepo.findOne.mockResolvedValue(link);
      linkRepo.save.mockResolvedValue({ ...link, title: 'New title' });

      await service.update('link-1', { title: 'New title' }, 'user-1');

      expect(scraper.scrape).not.toHaveBeenCalled();
    });

    it('re-scrapes when url changes and applies scraped values', async () => {
      const link = makeLink();
      linkRepo.findOne.mockResolvedValue(link);
      scraper.scrape.mockResolvedValue({ title: 'New OG', description: 'New Desc' });
      linkRepo.save.mockResolvedValue({ ...link, url: 'https://new.com', title: 'New OG' });

      await service.update('link-1', { url: 'https://new.com' }, 'user-1');

      expect(scraper.scrape).toHaveBeenCalledWith('https://new.com');
    });

    it('explicit title overrides scraped title on url change', async () => {
      const link = makeLink();
      linkRepo.findOne.mockResolvedValue(link);
      scraper.scrape.mockResolvedValue({ title: 'Scraped', description: null });
      linkRepo.save.mockImplementation((l: Link) => Promise.resolve(l));

      await service.update('link-1', { url: 'https://new.com', title: 'Explicit' }, 'user-1');

      expect(linkRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Explicit' }),
      );
    });

    it('throws ForbiddenException for wrong owner', async () => {
      linkRepo.findOne.mockResolvedValue(makeLink({ userId: 'user-1' }));

      await expect(service.update('link-1', { title: 'x' }, 'user-2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── archive ──────────────────────────────────────────────────────────────

  describe('archive', () => {
    it('sets archivedAt to now', async () => {
      const link = makeLink();
      linkRepo.findOne.mockResolvedValue(link);
      linkRepo.save.mockImplementation((l: Link) => Promise.resolve(l));

      const result = await service.archive('link-1', 'user-1');

      expect(result.archivedAt).toBeInstanceOf(Date);
    });

    it('throws ForbiddenException for wrong owner', async () => {
      linkRepo.findOne.mockResolvedValue(makeLink({ userId: 'user-1' }));

      await expect(service.archive('link-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes the link from the database', async () => {
      const link = makeLink();
      linkRepo.findOne.mockResolvedValue(link);
      linkRepo.remove.mockResolvedValue(undefined);

      await service.remove('link-1', 'user-1');

      expect(linkRepo.remove).toHaveBeenCalledWith(link);
    });

    it('throws NotFoundException when link does not exist', async () => {
      linkRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
