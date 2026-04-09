import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapedMeta {
  title: string | null;
  description: string | null;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  async scrape(url: string): Promise<ScrapedMeta> {
    try {
      const { data } = await axios.get<string>(url, {
        timeout: 5000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; LinkVault/1.0; +https://linkvault.app)',
        },
        maxRedirects: 5,
      });

      const $ = cheerio.load(data);

      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('title').first().text() ||
        null;

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        null;

      return {
        title: title?.trim() ?? null,
        description: description?.trim() ?? null,
      };
    } catch (err: unknown) {
      this.logger.warn(
        `Scrape failed for ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { title: null, description: null };
    }
  }
}
