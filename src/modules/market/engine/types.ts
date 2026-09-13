export type MarketEngineKind = 'auto' | 'python' | 'ts';

export interface EngineIndex {
  name: string;
  baseValue: number;
  volatility: number;
}

export interface EngineStock {
  symbol: string;
  companyName: string;
  sector: string;
  basePrice: number;
  volatility: number;
}

export interface EngineRegistry {
  stocks: EngineStock[];
  indices: EngineIndex[];
}

export interface IndexQuote {
  name: string;
  value: number;
  change: number;
  changePct: number;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
}

export interface GameRound {
  symbol: string;
  companyName: string;
  sector: string;
  startPrice: number;
  endPrice: number;
  change: number;
  changePct: number;
}

export interface MarketDataEngine {
  readonly kind: 'python' | 'ts';
  readonly available: boolean;
  getIndices(): Promise<IndexQuote[]>;
  getQuotes(symbols: string[]): Promise<StockQuote[]>;
  newGameRound(exclude?: string[]): Promise<GameRound>;
  close(): void;
}