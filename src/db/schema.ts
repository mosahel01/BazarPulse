import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const userRoles = ['USER', 'MODERATOR', 'ADMIN'] as const;
export type UserRole = (typeof userRoles)[number];

export const postStatuses = ['ACTIVE', 'HIDDEN', 'DELETED'] as const;
export type PostStatus = (typeof postStatuses)[number];

export const reportReasons = [
  'SPAM',
  'HARASSMENT',
  'MISINFORMATION',
  'PROMOTION',
  'OFF_TOPIC',
  'OTHER',
] as const;
export type ReportReason = (typeof reportReasons)[number];

export const reportStatuses = ['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED'] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export const ideaDirections = ['BULLISH', 'BEARISH', 'NEUTRAL'] as const;
export type IdeaDirection = (typeof ideaDirections)[number];

export const ideaStatuses = ['OPEN', 'HIT_TARGET', 'HIT_STOP', 'EXPIRED', 'CANCELLED'] as const;
export type IdeaStatus = (typeof ideaStatuses)[number];

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    username: text('username').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    googleSub: text('google_sub'),
    googlePicture: text('google_picture'),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    role: text('role', { enum: userRoles }).notNull().default('USER'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex('users_username_unique').on(sql`lower(${t.username})`),
    uniqueIndex('users_email_unique').on(t.email),
    uniqueIndex('users_google_sub_unique').on(t.googleSub),
  ],
);

export const stocks = sqliteTable('stocks', {
  symbol: text('symbol').primaryKey(),
  companyName: text('company_name').notNull(),
  exchange: text('exchange').notNull(),
  sector: text('sector').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const posts = sqliteTable(
  'posts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id),
    stockId: text('stock_id')
      .notNull()
      .references(() => stocks.symbol),
    title: text('title').notNull(),
    body: text('body').notNull(),
    status: text('status', { enum: postStatuses }).notNull().default('ACTIVE'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index('posts_stock_created_idx').on(t.stockId, t.createdAt),
    index('posts_author_created_idx').on(t.authorId, t.createdAt),
  ],
);

export const comments = sqliteTable(
  'comments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    status: text('status', { enum: postStatuses }).notNull().default('ACTIVE'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('comments_post_created_idx').on(t.postId, t.createdAt)],
);

export const postVotes = sqliteTable(
  'post_votes',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id),
    value: integer('value').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.postId] }),
    index('post_votes_post_idx').on(t.postId),
    check('post_votes_value_check', sql`${t.value} IN (1, -1)`),
  ],
);

export const watchlists = sqliteTable(
  'watchlists',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('watchlists_user_idx').on(t.userId)],
);

export const watchlistItems = sqliteTable(
  'watchlist_items',
  {
    watchlistId: integer('watchlist_id')
      .notNull()
      .references(() => watchlists.id, { onDelete: 'cascade' }),
    stockId: text('stock_id')
      .notNull()
      .references(() => stocks.symbol),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.watchlistId, t.stockId] })],
);

export const tradingIdeas = sqliteTable(
  'trading_ideas',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id),
    stockId: text('stock_id')
      .notNull()
      .references(() => stocks.symbol),
    direction: text('direction', { enum: ideaDirections }).notNull(),
    entryPrice: real('entry_price').notNull(),
    targetPrice: real('target_price').notNull(),
    stopLossPrice: real('stop_loss_price').notNull(),
    thesis: text('thesis').notNull(),
    status: text('status', { enum: ideaStatuses }).notNull().default('OPEN'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('trading_ideas_stock_created_idx').on(t.stockId, t.createdAt)],
);

export const reports = sqliteTable(
  'reports',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    reporterId: integer('reporter_id')
      .notNull()
      .references(() => users.id),
    postId: integer('post_id').references(() => posts.id),
    commentId: integer('comment_id').references(() => comments.id),
    reason: text('reason', { enum: reportReasons }).notNull(),
    description: text('description'),
    status: text('status', { enum: reportStatuses }).notNull().default('OPEN'),
    reviewedBy: integer('reviewed_by').references(() => users.id),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index('reports_status_created_idx').on(t.status, t.createdAt),
    check(
      'reports_exactly_one_target_check',
      sql`((${t.postId} IS NOT NULL AND ${t.commentId} IS NULL) OR (${t.postId} IS NULL AND ${t.commentId} IS NOT NULL))`,
    ),
  ],
);

export const moderationActions = sqliteTable('moderation_actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  moderatorId: integer('moderator_id')
    .notNull()
    .references(() => users.id),
  actionType: text('action_type').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  reason: text('reason'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Stock = typeof stocks.$inferSelect;
export type NewStock = typeof stocks.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type PostVote = typeof postVotes.$inferSelect;
export type Watchlist = typeof watchlists.$inferSelect;
export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type TradingIdea = typeof tradingIdeas.$inferSelect;
export type NewTradingIdea = typeof tradingIdeas.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
