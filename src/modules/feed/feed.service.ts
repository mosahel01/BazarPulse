import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../../db/schema.js';
import { paginationMeta } from '../../common/http/pagination.js';
import type { PostDto } from '../posts/posts.service.js';
import { PostsService } from '../posts/posts.service.js';
import type { FeedSort } from './feed.ranking.js';
import { compareRanked } from './feed.ranking.js';

type Db = BetterSQLite3Database<typeof schema>;

export interface FeedOptions {
  stock?: string | undefined;
  sort?: FeedSort;
  page?: number;
  pageSize?: number;
}

export class FeedService {
  private readonly posts: PostsService;

  constructor(db: Db) {
    this.posts = new PostsService(db);
  }

  async getFeed(options: FeedOptions, userId?: number): Promise<{
    data: PostDto[];
    meta: ReturnType<typeof paginationMeta>;
  }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const sort = options.sort ?? 'latest';

    const { rows, total } = await this.posts.listFeed(
      { stock: options.stock, limit: pageSize, offset: (page - 1) * pageSize },
      userId,
    );

    const ordered =
      sort === 'top'
        ? [...rows].sort((a, b) => compareRanked(a, b))
        : rows;

    return { data: ordered, meta: paginationMeta(total, page, pageSize) };
  }
}