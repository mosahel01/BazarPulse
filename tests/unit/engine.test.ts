import { describe, expect, it } from 'vitest';
import type { EngineRegistry } from '../../src/modules/market/engine/types.js';
import { fnv1a32 } from '../../src/modules/market/engine/hash.js';
import { SimulatorEngine } from '../../src/modules/market/engine/simulator.js';
import { ResilientMarketEngine } from '../../src/modules/market/engine/market-engine.js';
import { pythonEngineAvailable } from '../../src/modules/market/engine/python-worker.js';
import { PythonWorkerEngine } from '../../src/modules/market/engine/python-worker.js';

const registry: EngineRegistry = {
  stocks: [
    { symbol: 'TCS', companyName: 'Tata Consultancy Services', sector: 'IT Services', basePrice: 3_700, volatility: 0.014 },
    { symbol: 'RELIANCE', companyName: 'Reliance Industries', sector: 'Energy', basePrice: 2_950, volatility: 0.016 },
  ],
  indices: [
    { name: 'NIFTY 50', baseValue: 24_400, volatility: 0.008 },
    { name: 'SENSEX', baseValue: 80_100, volatility: 0.008 },
  ],
};

describe('market engine internals', () => {
  it('fnv1a32 is deterministic', () => {
    expect(fnv1a32('TCS:20260')).toBe(fnv1a32('TCS:20260'));
    expect(fnv1a32('a')).toBe(fnv1a32('a'));
    expect(fnv1a32('TCS:20260')).not.toBe(fnv1a32('TCS:20261'));
  });

  it('simulator produces deterministic indices for the same day', async () => {
    const engine = new SimulatorEngine(registry);
    const first = await engine.getIndices();
    const second = await engine.getIndices();
    expect(first).toEqual(second);
    expect(first.length).toBe(2);
    for (const idx of first) {
      expect(idx.name).toEqual(expect.any(String));
      expect(idx.value).toBeGreaterThan(0);
      expect(typeof idx.change).toBe('number');
      expect(typeof idx.changePct).toBe('number');
    }
  });

  it('simulator quotes respect the symbol filter', async () => {
    const engine = new SimulatorEngine(registry);
    const quotes = await engine.getQuotes(['TCS']);
    expect(quotes).toHaveLength(1);
    expect(quotes[0]?.symbol).toBe('TCS');
  });

  it('simulator game round returns one registered stock', async () => {
    const engine = new SimulatorEngine(registry);
    const round = await engine.newGameRound();
    expect(round.symbol).toEqual(expect.any(String));
    expect(round.startPrice).toBeGreaterThan(0);
    expect(round.endPrice).toBeGreaterThan(0);
  });

  it('simulator game round honours the exclusion list', async () => {
    const engine = new SimulatorEngine(registry);
    for (let i = 0; i < 20; i++) {
      const round = await engine.newGameRound(['TCS']);
      expect(round.symbol).not.toBe('TCS');
    }
  });

  it('simulator throws when no stocks are registered', async () => {
    const engine = new SimulatorEngine({ stocks: [], indices: [] });
    await expect(engine.newGameRound()).rejects.toThrow(/No stocks/);
  });

  it('resilient engine demotes to the fallback on first failure', async () => {
    const boom = {
      kind: 'python',
      available: true,
      getIndices: () => Promise.reject(new Error('python down')),
      getQuotes: () => Promise.reject(new Error('python down')),
      newGameRound: () => Promise.reject(new Error('python down')),
      close: () => {},
    } as const;

    const engine = new ResilientMarketEngine(registry, boom);
    const indices = await engine.getIndices();
    expect(indices.length).toBe(2);
    expect(engine.kind).toBe('ts');
  });
});

describe('python worker engine (integration, skipped when unavailable)', () => {
  const maybeEnabled = pythonEngineAvailable();
  const itPython = maybeEnabled ? it : it.skip;

  itPython('indices round-trip through the Python worker', async () => {
    const engine = new PythonWorkerEngine(registry);
    try {
      const indices = await engine.getIndices();
      expect(indices.length).toBe(2);
      expect(typeof indices[0]?.value).toBe('number');
      const quotes = await engine.getQuotes(['TCS']);
      expect(quotes).toHaveLength(1);
      expect(quotes[0]?.symbol).toBe('TCS');
    } finally {
      engine.close();
    }
  });
});