import { and, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../../db/schema.js';
import { tradingIdeas, users, type NewTradingIdea, type TradingIdea } from '../../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;

const ideaColumns = getTableColumns(tradingIdeas);

export interface IdeaRow extends TradingIdea {
  author: string;
}

export class IdeasRepository {
  constructor(private readonly db: Db) {}

  async list(options: {
    stock?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<IdeaRow[]> {
    return this.db
      .select({ ...ideaColumns, author: users.username })
      .from(tradingIdeas)
      .innerJoin(users, eq(tradingIdeas.authorId, users.id))
      .where(
        and(
          options.stock ? eq(tradingIdeas.stockId, options.stock.toUpperCase()) : undefined,
          sql`${tradingIdeas.status} != 'CANCELLED'`,
        ),
      )
      .orderBy(desc(tradingIdeas.createdAt))
      .limit(options.limit ?? 20)
      .offset(options.offset ?? 0)
      .all();
  }

  async count(options: { stock?: string | undefined } = {}): Promise<number> {
    const rows = this.db
      .select({ value: sql<number>`count(*)` })
      .from(tradingIdeas)
      .where(
        and(
          options.stock ? eq(tradingIdeas.stockId, options.stock.toUpperCase()) : undefined,
          sql`${tradingIdeas.status} != 'CANCELLED'`,
        ),
      )
      .all();
    return rows[0]?.value ?? 0;
  }

  findById(id: number): Promise<TradingIdea | undefined> {
    return this.db.query.tradingIdeas.findFirst({
      where: eq(tradingIdeas.id, id),
    });
  }

  create(input: NewTradingIdea): Promise<TradingIdea> {
    return this.db.insert(tradingIdeas).values(input).returning().then(firstRowOrThrow);
  }
}

function firstRowOrThrow<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error('Expected at least one result row.');
  }
  return row;
}