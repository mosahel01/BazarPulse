import { and, count, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../../db/schema.js';
import { stocks, type Stock } from '../../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;

export interface StockListOptions {
  search?: string | undefined;
  sector?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

function searchCondition(query?: string): SQL | undefined {
  const search = query?.trim();
  if (!search) {
    return undefined;
  }
  const pattern = `%${search.toLowerCase()}%`;
  return sql`(lower(${stocks.symbol}) LIKE ${pattern} OR lower(${stocks.companyName}) LIKE ${pattern} OR lower(${stocks.sector}) LIKE ${pattern})`;
}

function sectorCondition(sector?: string): SQL | undefined {
  return sector ? sql`lower(${stocks.sector}) = ${sector.toLowerCase()}` : undefined;
}

function listWhere(options: Pick<StockListOptions, 'search' | 'sector'>): SQL | undefined {
  return and(searchCondition(options.search), sectorCondition(options.sector));
}

export class StockRepository {
  constructor(private readonly db: Db) {}

  async list(options: StockListOptions = {}): Promise<Stock[]> {
    const where = listWhere(options);
    const query = this.db
      .select()
      .from(stocks)
      .orderBy(stocks.symbol)
      .limit(options.limit ?? 50);

    return query
      .offset(options.offset ?? 0)
      .where(where ?? sql`1 = 1`)
      .all();
  }

  count(options: Pick<StockListOptions, 'search' | 'sector'> = {}): Promise<number> {
    const rows = this.db
      .select({ count: count() })
      .from(stocks)
      .where(listWhere(options) ?? sql`1 = 1`)
      .all();
    return Promise.resolve(rows[0]?.count ?? 0);
  }

  findById(symbol: string): Promise<Stock | undefined> {
    return this.db.query.stocks.findFirst({
      where: eq(stocks.symbol, symbol.toUpperCase()),
    });
  }

  async bySymbols(symbols: string[]): Promise<Stock[]> {
    const unique = [...new Set(symbols)].filter(Boolean);
    if (unique.length === 0) {
      return [];
    }
    return this.db
      .select()
      .from(stocks)
      .where(inArray(stocks.symbol, unique))
      .all();
  }
}