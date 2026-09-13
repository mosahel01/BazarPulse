import { fnv1a32 } from './engine/hash.js';
import type { EngineIndex, EngineRegistry, EngineStock } from './engine/types.js';

/**
 * Fictional base prices for the seeded universe, matching the demo frontend.
 * Used only to seed the synthetic market engine — never real market data.
 */
const BASE_PRICES: Record<string, number> = {
  RELIANCE: 2912.4,
  TCS: 4210.0,
  INFY: 1568.75,
  HDFCBANK: 1684.35,
  ICICIBANK: 1283.5,
  SBIN: 822.15,
  ITC: 486.6,
  TATASTEEL: 154.9,
  BHARTIARTL: 1547.4,
  HINDUNILVR: 2590.7,
};

const INDEX_DEFINITIONS: EngineIndex[] = [
  { name: 'NIFTY 50', baseValue: 24580.4, volatility: 0.008 },
  { name: 'SENSEX', baseValue: 80640.1, volatility: 0.008 },
  { name: 'BANK NIFTY', baseValue: 52340.6, volatility: 0.01 },
  { name: 'INDIA VIX', baseValue: 13.42, volatility: 0.04 },
];

/** Stable per-symbol volatility in [0.6%, 3.1%). */
export function volatilityFor(symbol: string): number {
  return 0.006 + (fnv1a32(`${symbol}:vol`) % 250) / 10_000;
}

export function basePriceFor(symbol: string): number {
  return BASE_PRICES[symbol] ?? 100;
}

export function buildEngineRegistry(
  stocks: Array<{ symbol: string; companyName: string; sector: string }>,
): EngineRegistry {
  const engineStocks: EngineStock[] = stocks.map((stock) => ({
    symbol: stock.symbol,
    companyName: stock.companyName,
    sector: stock.sector,
    basePrice: basePriceFor(stock.symbol),
    volatility: volatilityFor(stock.symbol),
  }));

  return { stocks: engineStocks, indices: INDEX_DEFINITIONS };
}