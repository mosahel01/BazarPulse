import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../../db/schema.js';
import { AppError } from '../../common/errors/app-error.js';
import { StockRepository } from '../stocks/stocks.repository.js';
import type { WatchlistRow } from './watchlists.repository.js';
import { WatchlistRepository } from './watchlists.repository.js';

export interface WatchlistDto {
  id: number;
  name: string;
  stocks: string[];
  createdAt: string;
}

export class WatchlistsService {
  private readonly repo: WatchlistRepository;
  private readonly stocks: StockRepository;

  constructor(db: BetterSQLite3Database<typeof schema>) {
    this.repo = new WatchlistRepository(db);
    this.stocks = new StockRepository(db);
  }

  async list(userId: number): Promise<WatchlistDto[]> {
    const rows = await this.repo.listForUser(userId);
    return rows.map(toDto);
  }

  async get(userId: number, watchlistId: number): Promise<WatchlistDto> {
    const row = await this.repo.getRow(watchlistId);
    if (!row || row.userId !== userId) {
      throw AppError.notFound('Watchlist not found.');
    }
    return toDto(row);
  }

  async create(userId: number, name: string): Promise<WatchlistDto> {
    const list = await this.repo.create(userId, name.trim());
    return toDto({ ...list, stocks: [] });
  }

  async rename(userId: number, watchlistId: number, name: string): Promise<WatchlistDto> {
    const row = await this.repo.getRow(watchlistId);
    if (!row || row.userId !== userId) {
      throw AppError.notFound('Watchlist not found.');
    }
    const renamed = await this.repo.rename(watchlistId, name.trim());
    return toDto({ ...row, name: renamed?.name ?? name });
  }

  async remove(userId: number, watchlistId: number): Promise<void> {
    const row = await this.repo.findById(watchlistId);
    if (!row || row.userId !== userId) {
      throw AppError.notFound('Watchlist not found.');
    }
    this.repo.delete(watchlistId);
  }

  async addStock(userId: number, watchlistId: number, symbol: string): Promise<WatchlistDto> {
    const row = await this.repo.getRow(watchlistId);
    if (!row || row.userId !== userId) {
      throw AppError.notFound('Watchlist not found.');
    }

    const stock = await this.stocks.findById(symbol);
    if (!stock) {
      throw AppError.notFound(`No stock with symbol ${symbol} exists.`);
    }
    if (!this.repo.existsStock(watchlistId, stock.symbol)) {
      this.repo.addStock(watchlistId, stock.symbol);
    }

    const updated = await this.repo.getRow(watchlistId);
    return toDto(updated ?? row);
  }

  async removeStock(userId: number, watchlistId: number, symbol: string): Promise<WatchlistDto> {
    const row = await this.repo.getRow(watchlistId);
    if (!row || row.userId !== userId) {
      throw AppError.notFound('Watchlist not found.');
    }
    this.repo.removeStock(watchlistId, symbol.toUpperCase());
    const updated = await this.repo.getRow(watchlistId);
    return toDto(updated ?? row);
  }
}

function toDto(row: WatchlistRow): WatchlistDto {
  return {
    id: row.id,
    name: row.name,
    stocks: [...row.stocks],
    createdAt: row.createdAt.toISOString(),
  };
}