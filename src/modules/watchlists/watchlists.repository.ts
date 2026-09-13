import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../../db/schema.js';
import { watchlistItems, watchlists, type Watchlist } from '../../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;

export interface WatchlistRow extends Watchlist {
  stocks: string[];
}

export class WatchlistRepository {
  constructor(private readonly db: Db) {}

  async listForUser(userId: number): Promise<WatchlistRow[]> {
    const lists = this.db
      .select()
      .from(watchlists)
      .where(eq(watchlists.userId, userId))
      .orderBy(asc(watchlists.createdAt))
      .all();
    return this.withStocks(lists);
  }

  async findById(id: number): Promise<Watchlist | undefined> {
    return this.db.query.watchlists.findFirst({ where: eq(watchlists.id, id) });
  }

  async getRow(id: number): Promise<WatchlistRow | undefined> {
    const list = await this.findById(id);
    if (!list) {
      return undefined;
    }
    const rows = await this.withStocks([list]);
    return rows[0];
  }

  create(userId: number, name: string): Promise<Watchlist> {
    return this.db
      .insert(watchlists)
      .values({ userId, name })
      .returning()
      .then((rows) => rows[0] as Watchlist);
  }

  async rename(id: number, name: string): Promise<Watchlist | undefined> {
    const rows = await this.db
      .update(watchlists)
      .set({ name, updatedAt: new Date() })
      .where(eq(watchlists.id, id))
      .returning();
    return rows[0];
  }

  delete(id: number): void {
    this.db.delete(watchlists).where(eq(watchlists.id, id)).run();
  }

  existsStock(watchlistId: number, symbol: string): boolean {
    return this.db
      .select({ watchlistId: watchlistItems.watchlistId })
      .from(watchlistItems)
      .where(
        and(
          eq(watchlistItems.watchlistId, watchlistId),
          eq(sql`upper(${watchlistItems.stockId})`, symbol),
        ),
      )
      .all().length > 0;
  }

  addStock(watchlistId: number, symbol: string): void {
    this.db
      .insert(watchlistItems)
      .values({ watchlistId, stockId: symbol, createdAt: new Date() })
      .onConflictDoNothing()
      .run();
  }

  removeStock(watchlistId: number, symbol: string): void {
    this.db
      .delete(watchlistItems)
      .where(
        and(
          eq(watchlistItems.watchlistId, watchlistId),
          eq(sql`upper(${watchlistItems.stockId})`, symbol),
        ),
      )
      .run();
  }

  private async withStocks(lists: Watchlist[]): Promise<WatchlistRow[]> {
    if (lists.length === 0) {
      return [];
    }
    const ids = lists.map((list) => list.id);
    const items = this.db
      .select()
      .from(watchlistItems)
      .where(
        inArray(
          watchlistItems.watchlistId,
          ids as [number, ...number[]],
        ),
      )
      .all();

    const byList = new Map<number, string[]>();
    for (const item of items) {
      const symbols = byList.get(item.watchlistId) ?? [];
      symbols.push(item.stockId);
      byList.set(item.watchlistId, symbols);
    }

    return lists.map((list) => ({ ...list, stocks: byList.get(list.id) ?? [] }));
  }
}