import { fnv1a32 } from './hash.js';
import type {
  EngineRegistry,
  GameRound,
  IndexQuote,
  MarketDataEngine,
  StockQuote,
} from './types.js';

const DAY_SECONDS = 86_400;

/** Deterministic value in [-0.5, 0.5) derived from `key`. */
function scaledHash(key: string): number {
  return fnv1a32(key) % 10_000 / 10_000 - 0.5;
}

function round2(value: number): number {
  return Math.floor(value * 100 + 0.5) / 100;
}

function round4(value: number): number {
  return Math.floor(value * 10_000 + 0.5) / 10_000;
}

function dailyReturn(symbol: string, day: number, mu: number, sigma: number): number {
  const noise = scaledHash(`${symbol}:${day}`);
  return mu + 2 * sigma * noise;
}

/**
 * Pure TypeScript simulation of the Python market engine. Produces the same
 * deterministic numbers for indices/quotes (same inputs => same outputs), so
 * the backend behaves identically with or without Python available.
 */
export class SimulatorEngine implements MarketDataEngine {
  readonly kind = 'ts' as const;
  readonly available = true;

  constructor(private readonly registry: EngineRegistry) {}

  private today(): number {
    return Math.floor(Date.now() / 1000 / DAY_SECONDS);
  }

  async getIndices(): Promise<IndexQuote[]> {
    const day = this.today();
    return this.registry.indices.map((index) => {
      const ret = dailyReturn(index.name, day, 0.0003, index.volatility);
      const value = round2(index.baseValue * (1 + ret));
      const change = round2(value - index.baseValue);
      const changePct = round4(((value - index.baseValue) / index.baseValue) * 100);
      return { name: index.name, value, change, changePct };
    });
  }

  async getQuotes(symbols: string[]): Promise<StockQuote[]> {
    const day = this.today();
    const wanted = new Set(symbols);
    return this.registry.stocks
      .filter((stock) => wanted.size === 0 || wanted.has(stock.symbol))
      .map((stock) => {
        const ret = dailyReturn(stock.symbol, day, 0.0002, stock.volatility);
        const price = round2(stock.basePrice * (1 + ret));
        const change = round2(price - stock.basePrice);
        const changePct = round4(((price - stock.basePrice) / stock.basePrice) * 100);
        return { symbol: stock.symbol, price, change, changePct };
      });
  }

  async newGameRound(exclude: string[] = []): Promise<GameRound> {
    const excluded = new Set(exclude);
    const pool = this.registry.stocks.filter((stock) => !excluded.has(stock.symbol));
    const candidates = pool.length > 0 ? pool : this.registry.stocks;
    if (candidates.length === 0) {
      throw new Error('No stocks registered in the market engine.');
    }

    const stock =
      candidates[Math.floor(Math.random() * candidates.length)] ??
      candidates[0];
    if (!stock) {
      throw new Error('No stocks registered in the market engine.');
    }
    const startPrice = round2(
      stock.basePrice * (1 + dailyReturn(stock.symbol, this.today(), 0.0002, stock.volatility)),
    );
    const direction = Math.random() < 0.52 ? 1 : -1;
    const magnitude = 0.003 + Math.random() * 0.027;
    const endPrice = round2(startPrice * (1 + direction * magnitude));
    const change = round2(endPrice - startPrice);
    const changePct = round4((change / startPrice) * 100);

    return {
      symbol: stock.symbol,
      companyName: stock.companyName,
      sector: stock.sector,
      startPrice,
      endPrice,
      change,
      changePct,
    };
  }

  close(): void {
    // Nothing to release for the in-process simulator.
  }
}