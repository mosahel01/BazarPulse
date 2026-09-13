import { and, asc, desc, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../../db/schema.js';
import {
  comments,
  posts,
  postVotes,
  users,
  type NewComment,
  type NewPost,
  type Post,
} from '../../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;

const postColumns = getTableColumns(posts);

export interface PostFeedRow extends Post {
  author: string;
}

export interface FeedQueryOptions {
  stock?: string | undefined;
  status?: 'ACTIVE' | 'HIDDEN' | 'DELETED';
  limit?: number | undefined;
  offset?: number | undefined;
}

export class PostRepository {
  constructor(private readonly db: Db) {}

  async listFeed(options: FeedQueryOptions = {}): Promise<PostFeedRow[]> {
    return this.db
      .select({ ...postColumns, author: users.username })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          options.status ? eq(posts.status, options.status) : eq(posts.status, 'ACTIVE'),
          options.stock ? eq(posts.stockId, options.stock.toUpperCase()) : undefined,
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(options.limit ?? 20)
      .offset(options.offset ?? 0)
      .all();
  }

  async countFeed(options: Pick<FeedQueryOptions, 'stock' | 'status'> = {}): Promise<number> {
    const rows = this.db
      .select({ value: sql<number>`count(*)` })
      .from(posts)
      .where(
        and(
          options.status ? eq(posts.status, options.status) : eq(posts.status, 'ACTIVE'),
          options.stock ? eq(posts.stockId, options.stock.toUpperCase()) : undefined,
        ),
      )
      .all();
    return rows[0]?.value ?? 0;
  }

  findById(id: number): Promise<Post | undefined> {
    return this.db.query.posts.findFirst({ where: eq(posts.id, id) });
  }

  findActiveById(id: number): Promise<Post | undefined> {
    return this.db.query.posts.findFirst({
      where: and(eq(posts.id, id), eq(posts.status, 'ACTIVE')),
    });
  }

  create(input: NewPost): Promise<Post> {
    return this.db.insert(posts).values(input).returning().then(firstRowOrThrow);
  }

  async update(id: number, patch: Partial<NewPost>): Promise<Post | undefined> {
    const rows = await this.db
      .update(posts)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return rows[0];
  }

  setStatus(id: number, status: Post['status']): Promise<Post | undefined> {
    return this.update(id, { status });
  }

  // ── Aggregates (raw SQL through the same connection) ─────────────────────

  async votesForPosts(postIds: number[]): Promise<Map<number, { upvotes: number; downvotes: number }>> {
    const unique = [...new Set(postIds)].filter((id) => id != null);
    const result = new Map<number, { upvotes: number; downvotes: number }>();
    if (unique.length === 0) {
      return result;
    }

    const rows = this.db
      .select({ postId: postVotes.postId, value: postVotes.value })
      .from(postVotes)
      .where(inArray(postVotes.postId, unique))
      .all();

    for (const row of rows) {
      const totals = result.get(row.postId) ?? { upvotes: 0, downvotes: 0 };
      if (row.value === 1) {
        totals.upvotes += 1;
      } else if (row.value === -1) {
        totals.downvotes += 1;
      }
      result.set(row.postId, totals);
    }
    return result;
  }

  async votesForPost(postId: number): Promise<{ upvotes: number; downvotes: number }> {
    const map = await this.votesForPosts([postId]);
    return map.get(postId) ?? { upvotes: 0, downvotes: 0 };
  }

  async commentCountsForPosts(postIds: number[]): Promise<Map<number, number>> {
    const unique = [...new Set(postIds)].filter((id) => id != null);
    const result = new Map<number, number>();
    if (unique.length === 0) {
      return result;
    }

    const rows = this.db
      .select({ postId: comments.postId })
      .from(comments)
      .where(and(inArray(comments.postId, unique), eq(comments.status, 'ACTIVE')))
      .all();

    for (const row of rows) {
      result.set(row.postId, (result.get(row.postId) ?? 0) + 1);
    }
    return result;
  }

  async userVote(postId: number, userId: number): Promise<number | undefined> {
    const row = this.db
      .select({ value: postVotes.value })
      .from(postVotes)
      .where(and(eq(postVotes.postId, postId), eq(postVotes.userId, userId)))
      .all()[0];
    return row?.value;
  }

  upsertVote(postId: number, userId: number, value: number): void {
    const existing = this.db
      .select({ value: postVotes.value })
      .from(postVotes)
      .where(and(eq(postVotes.postId, postId), eq(postVotes.userId, userId)))
      .all()[0]?.value;

    if (existing === undefined) {
      this.db
        .insert(postVotes)
        .values({ postId, userId, value, createdAt: new Date(), updatedAt: new Date() })
        .run();
      return;
    }
    if (existing !== value) {
      this.db
        .update(postVotes)
        .set({ value, updatedAt: new Date() })
        .where(and(eq(postVotes.postId, postId), eq(postVotes.userId, userId)))
        .run();
    }
  }

  deleteVote(postId: number, userId: number): void {
    this.db
      .delete(postVotes)
      .where(and(eq(postVotes.postId, postId), eq(postVotes.userId, userId)))
      .run();
  }

  // ── Comments ─────────────────────────────────────────────────────────────

  async listComments(postId: number): Promise<Array<schema.Comment & { author: string }>> {
    const rows = this.db
      .select({
        id: comments.id,
        postId: comments.postId,
        authorId: comments.authorId,
        body: comments.body,
        status: comments.status,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        author: users.username,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(and(eq(comments.postId, postId), eq(comments.status, 'ACTIVE')))
      .orderBy(asc(comments.createdAt))
      .all();
    return rows as Array<schema.Comment & { author: string }>;
  }

  findCommentById(id: number): Promise<schema.Comment | undefined> {
    return this.db.query.comments.findFirst({ where: eq(comments.id, id) });
  }

  createComment(input: NewComment): Promise<schema.Comment> {
    return this.db.insert(comments).values(input).returning().then(firstRowOrThrow);
  }
}

function firstRowOrThrow<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error('Expected at least one result row.');
  }
  return row;
}