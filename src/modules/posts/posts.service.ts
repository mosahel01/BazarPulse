import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../../db/schema.js';
import { AppError } from '../../common/errors/app-error.js';
import { users, type UserRole } from '../../db/schema.js';
import { StockRepository } from '../stocks/stocks.repository.js';
import type { CreateCommentInput, CreatePostInput, UpdatePostInput } from './posts.schemas.js';
import type { PostFeedRow } from './posts.repository.js';
import { PostRepository } from './posts.repository.js';

type Db = BetterSQLite3Database<typeof schema>;

export type PostStatus = schema.PostStatus;

export interface PostDto {
  id: number;
  author: string;
  stockSymbol: string;
  title: string;
  body: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  comments: number;
  upvotes: number;
  downvotes: number;
  userVote?: number;
}

export interface CommentDto {
  id: number;
  postId: number;
  author: string;
  body: string;
  createdAt: string;
}

export interface VoteResult {
  postId: number;
  userVote: number | undefined;
  upvotes: number;
  downvotes: number;
  score: number;
}

const MODERATION_ROLES: ReadonlySet<UserRole> = new Set(['MODERATOR', 'ADMIN']);

export class PostsService {
  private readonly posts: PostRepository;
  private readonly stocks: StockRepository;
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
    this.posts = new PostRepository(db);
    this.stocks = new StockRepository(db);
  }

  async createPost(userId: number, input: CreatePostInput): Promise<PostDto> {
    const stock = await this.stocks.findById(input.stockSymbol);
    if (!stock) {
      throw AppError.notFound(`No stock with symbol ${input.stockSymbol} exists.`);
    }

    const post = await this.posts.create({
      authorId: userId,
      stockId: stock.symbol,
      title: input.title,
      body: input.body,
      status: 'ACTIVE',
    });
    const author = await this.authorName(userId);
    return {
      ...this.postBase(post, author),
      comments: 0,
      upvotes: 0,
      downvotes: 0,
    };
  }

  async getPost(postId: number, userId?: number): Promise<PostDto> {
    const post = await this.posts.findActiveById(postId);
    if (!post) {
      throw AppError.notFound('Post not found.');
    }
    const author = await this.authorName(post.authorId);
    const [userVote, votes, commentCount] = await Promise.all([
      userId === undefined ? undefined : this.posts.userVote(postId, userId),
      this.posts.votesForPost(postId),
      this.commentCount(postId),
    ]);
    return {
      ...this.postBase(post, author),
      comments: commentCount,
      upvotes: votes.upvotes,
      downvotes: votes.downvotes,
      ...(userVote !== undefined ? { userVote } : {}),
    };
  }

  async listFeed(
    options: {
      stock?: string | undefined;
      limit?: number | undefined;
      offset?: number | undefined;
    },
    userId?: number,
  ): Promise<{ rows: PostDto[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.posts.listFeed({
        stock: options.stock,
        status: 'ACTIVE',
        limit: options.limit,
        offset: options.offset,
      }),
      this.posts.countFeed({ stock: options.stock, status: 'ACTIVE' }),
    ]);
    const enriched = await this.enrich(rows, userId);
    return { rows: enriched, total };
  }

  async updatePost(
    userId: number,
    role: UserRole,
    postId: number,
    patch: UpdatePostInput,
  ): Promise<PostDto> {
    const post = await this.posts.findById(postId);
    if (!post || post.status === 'DELETED') {
      throw AppError.notFound('Post not found.');
    }
    this.assertCanModerate(post, userId, role);

    const updated = await this.posts.update(postId, {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.body !== undefined ? { body: patch.body } : {}),
    });
    if (!updated) {
      throw AppError.notFound('Post not found.');
    }
    const author = await this.authorName(updated.authorId);
    return this.getPostDto(updated, author, userId);
  }

  async deletePost(userId: number, role: UserRole, postId: number): Promise<void> {
    const post = await this.posts.findById(postId);
    if (!post || post.status === 'DELETED') {
      throw AppError.notFound('Post not found.');
    }
    this.assertCanModerate(post, userId, role);
    await this.posts.setStatus(postId, 'DELETED');
  }

  async listComments(postId: number): Promise<CommentDto[]> {
    const post = await this.posts.findActiveById(postId);
    if (!post) {
      throw AppError.notFound('Post not found.');
    }
    const commentsRows = await this.posts.listComments(postId);
    return commentsRows.map((comment) => ({
      id: comment.id,
      postId: comment.postId,
      author: comment.author,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
    }));
  }

  async addComment(userId: number, postId: number, input: CreateCommentInput): Promise<CommentDto> {
    const post = await this.posts.findActiveById(postId);
    if (!post) {
      throw AppError.notFound('Post not found.');
    }
    const comment = await this.posts.createComment({
      postId,
      authorId: userId,
      body: input.body,
      status: 'ACTIVE',
    });
    const author = await this.authorName(userId);
    return {
      id: comment.id,
      postId: comment.postId,
      author,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  async vote(userId: number, postId: number, value: 1 | -1): Promise<VoteResult> {
    const post = await this.posts.findActiveById(postId);
    if (!post) {
      throw AppError.notFound('Post not found.');
    }
    this.posts.upsertVote(postId, userId, value);
    return this.voteSummary(postId, userId);
  }

  async removeVote(userId: number, postId: number): Promise<VoteResult> {
    const post = await this.posts.findActiveById(postId);
    if (!post) {
      throw AppError.notFound('Post not found.');
    }
    this.posts.deleteVote(postId, userId);
    return this.voteSummary(postId, userId);
  }

  // ── internals ────────────────────────────────────────────────────────────

  private async voteSummary(postId: number, userId: number): Promise<VoteResult> {
    const userVote = await this.posts.userVote(postId, userId);
    const votes = await this.posts.votesForPost(postId);
    const score = votes.upvotes - votes.downvotes;
    return { postId, userVote, upvotes: votes.upvotes, downvotes: votes.downvotes, score };
  }

  private async commentCount(postId: number): Promise<number> {
    const map = await this.posts.commentCountsForPosts([postId]);
    return map.get(postId) ?? 0;
  }

  private async enrich(rows: PostFeedRow[], userId?: number): Promise<PostDto[]> {
    const ids = rows.map((row) => row.id);
    const [votes, counts, userVotes] = await Promise.all([
      this.posts.votesForPosts(ids),
      this.posts.commentCountsForPosts(ids),
      userId === undefined
        ? Promise.resolve(new Map<number, number>())
        : this.userVotesForRows(ids, userId),
    ]);

    return rows.map((row) => {
      const voteTotals = votes.get(row.id) ?? { upvotes: 0, downvotes: 0 };
      const userVote = userVotes.get(row.id);
      return {
        ...this.postBase(row, row.author),
        comments: counts.get(row.id) ?? 0,
        upvotes: voteTotals.upvotes,
        downvotes: voteTotals.downvotes,
        ...(userVote !== undefined ? { userVote } : {}),
      };
    });
  }

  private async userVotesForRows(postIds: number[], userId: number): Promise<Map<number, number>> {
    const result = new Map<number, number>();
    for (const postId of postIds) {
      const value = await this.posts.userVote(postId, userId);
      if (value !== undefined) {
        result.set(postId, value);
      }
    }
    return result;
  }

  private postBase(
    post: Pick<PostFeedRow, 'id' | 'stockId' | 'title' | 'body' | 'status' | 'createdAt' | 'updatedAt'>,
    author: string,
  ): Omit<PostDto, 'comments' | 'upvotes' | 'downvotes' | 'userVote'> {
    return {
      id: post.id,
      author,
      stockSymbol: post.stockId,
      title: post.title,
      body: post.body,
      status: post.status,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  private async getPostDto(
    post: schema.Post,
    author: string,
    userId?: number,
  ): Promise<PostDto> {
    const [userVote, votes, commentCount] = await Promise.all([
      userId === undefined ? undefined : this.posts.userVote(post.id, userId),
      this.posts.votesForPost(post.id),
      this.commentCount(post.id),
    ]);
    return {
      ...this.postBase(post, author),
      comments: commentCount,
      upvotes: votes.upvotes,
      downvotes: votes.downvotes,
      ...(userVote !== undefined ? { userVote } : {}),
    };
  }

  private assertCanModerate(post: schema.Post, userId: number, role: UserRole): void {
    if (post.authorId === userId || MODERATION_ROLES.has(role)) {
      return;
    }
    throw AppError.forbidden('You do not have permission to modify this post.');
  }

  private async authorName(userId: number): Promise<string> {
    const row = this.db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .all()[0];
    return row?.username ?? `user_${userId}`;
  }
}