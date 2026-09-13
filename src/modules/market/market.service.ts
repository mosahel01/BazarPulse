import type { MarketDataEngine } from './engine/types.js';
import type { StockRepository } from '../stocks/stocks.repository.js';

export class MarketService {
  constructor(
    private readonly engine: MarketDataEngine,
    private readonly stocks: StockRepository,
  ) {}

  get engineKind(): 'python' | 'ts' {
    return this.engine.kind;
  }

  async indices(): Promise<Awaited<ReturnType<MarketDataEngine['getIndices']>>> {
    return this.engine.getIndices();
  }

  async quotes(symbols: string[]): Promise<Awaited<ReturnType<MarketDataEngine['getQuotes']>>> {
    const valid = await this.stocks.bySymbols(symbols);
    const validSymbols = valid.map((stock) => stock.symbol);
    if (validSymbols.length === 0) {
      return [];
    }
    return this.engine.getQuotes(validSymbols);
  }

  async allQuotes(): Promise<Awaited<ReturnType<MarketDataEngine['getQuotes']>>> {
    return this.engine.getQuotes([]);
  }

  async gameRound(exclude: string[] = []): Promise<Awaited<ReturnType<MarketDataEngine['newGameRound']>>> {
    return this.engine.newGameRound(exclude);
  }
}