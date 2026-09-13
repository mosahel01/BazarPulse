import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { AppError } from '../../common/errors/app-error.js';
import { users, type IdeaDirection, type IdeaStatus, type TradingIdea } from '../../db/schema.js';
import type * as schema from '../../db/schema.js';
import { StockRepository } from '../stocks/stocks.repository.js';
import type { IdeaInput } from './ideas.rules.js';
import { validateIdeaPrices } from './ideas.rules.js';
import { IdeasRepository } from './ideas.repository.js';

type Db = BetterSQLite3Database<typeof schema>;

export interface IdeaDto {
  id: number;
  author: string;
  stockSymbol: string;
  direction: IdeaDirection;
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  thesis: string;
  status: IdeaStatus;
  createdAt: string;
  updatedAt?: string;
}

export class IdeasService {
  private readonly ideas: IdeasRepository;
  private readonly stocks: StockRepository;

  constructor(private readonly db: Db) {
    this.ideas = new IdeasRepository(db);
    this.stocks = new StockRepository(db);
  }

  async list(options: {
    stock?: string | undefined;
    page?: number;
    pageSize?: number;
  }): Promise<{ rows: IdeaDto[]; total: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const [rows, total] = await Promise.all([
      this.ideas.list({ stock: options.stock, limit: pageSize, offset: (page - 1) * pageSize }),
      this.ideas.count({ stock: options.stock }),
    ]);
    return { rows: rows.map((row) => toDto(row, row.author)), total };
  }

  async get(id: number): Promise<IdeaDto | null> {
    const idea = await this.ideas.findById(id);
    if (!idea || idea.status === 'CANCELLED') {
      return null;
    }
    const author = await this.authorName(idea.authorId);
    return toDto(idea, author);
  }

  async create(userId: number, input: IdeaInput): Promise<IdeaDto> {
    const stock = await this.stocks.findById(input.stockSymbol);
    if (!stock) {
      throw AppError.notFound(`No stock with symbol ${input.stockSymbol} exists.`);
    }
    validateIdeaPrices({ ...input, stockSymbol: stock.symbol });

    const idea = await this.ideas.create({
      authorId: userId,
      stockId: stock.symbol,
      direction: input.direction,
      entryPrice: input.entryPrice,
      targetPrice: input.targetPrice,
      stopLossPrice: input.stopLossPrice,
      thesis: input.thesis,
      status: 'OPEN',
    });
    const author = await this.authorName(userId);
    return toDto(idea, author);
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

function toDto(idea: TradingIdea, author: string): IdeaDto {
  return {
    id: idea.id,
    author,
    stockSymbol: idea.stockId,
    direction: idea.direction,
    entryPrice: idea.entryPrice,
    targetPrice: idea.targetPrice,
    stopLossPrice: idea.stopLossPrice,
    thesis: idea.thesis,
    status: idea.status,
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
  };
}