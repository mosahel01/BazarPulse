import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../../db/schema.js';
import type { MarketDataEngine } from '../market/engine/types.js';
import { StockRepository } from './stocks.repository.js';
import type { Stock } from '../../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;

export interface StockDto {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  description: string | null;
  price: number;
  change: number;
  changePct: number;
}

export interface StockListResult {
  rows: StockDto[];
  total: number;
}

export class StocksService {
  private readonly repo: StockRepository;

  constructor(
    db: Db,
    private readonly engine: MarketDataEngine,
  ) {
    this.repo = new StockRepository(db);
  }

  async list(options: {
    search?: string | undefined;
    sector?: string | undefined;
    page?: number;
    pageSize?: number;
  }): Promise<StockListResult> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    const [rows, total, quotes] = await Promise.all([
      this.repo.list({ search: options.search, sector: options.sector, limit: pageSize, offset }),
      this.repo.count({ search: options.search, sector: options.sector }),
      this.engine.getQuotes([]),
    ]);

    const quotesBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
    return {
      rows: rows.map((stock) => mergeQuote(stock, quotesBySymbol.get(stock.symbol))),
      total,
    };
  }

  async get(symbol: string): Promise<StockDto | null> {
    const stock = await this.repo.findById(symbol);
    if (!stock) {
      return null;
    }
    const quote = await this.engine.getQuotes([symbol]).then((quotes) => quotes[0]);
    return mergeQuote(stock, quote);
  }
}

function mergeQuote(
  stock: Stock,
  quote?: { price: number; change: number; changePct: number },
): StockDto {
  return {
    symbol: stock.symbol,
    companyName: stock.companyName,
    exchange: stock.exchange,
    sector: stock.sector,
    description: stock.description,
    price: quote?.price ?? 0,
    change: quote?.change ?? 0,
    changePct: quote?.changePct ?? 0,
  };
}