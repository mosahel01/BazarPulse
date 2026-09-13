import type {
  EngineRegistry,
  GameRound,
  IndexQuote,
  MarketDataEngine,
  MarketEngineKind,
  StockQuote,
} from './types.js';
import { SimulatorEngine } from './simulator.js';
import { PythonWorkerEngine, pythonEngineAvailable } from './python-worker.js';

/**
 * Picks an engine per the configured preference. `'auto'` uses Python when it
 * is present and healthy, otherwise the pure-TypeScript simulator.
 */
export function createMarketEngine(
  registry: EngineRegistry,
  prefer: MarketEngineKind = 'auto',
  onDemote?: (message: string) => void,
): MarketDataEngine {
  let engine: MarketDataEngine;
  if (prefer === 'ts') {
    engine = new SimulatorEngine(registry);
  } else if (prefer === 'python') {
    engine = new PythonWorkerEngine(registry);
  } else {
    engine = pythonEngineAvailable() ? new PythonWorkerEngine(registry) : new SimulatorEngine(registry);
  }
  return new ResilientMarketEngine(registry, engine, onDemote);
}

/**
 * Wraps the primary engine and permanently demotes to the TypeScript
 * simulator if the primary ever fails (spawn errors, handshake timeouts,
 * unexpected exits). Keeps the API up even when Python is unavailable.
 */
export class ResilientMarketEngine implements MarketDataEngine {
  private engine: MarketDataEngine;
  private demoted = false;

  constructor(
    private readonly registry: EngineRegistry,
    engine: MarketDataEngine,
    private readonly onDemote?: (message: string) => void,
  ) {
    this.engine = engine;
  }

  get kind(): 'python' | 'ts' {
    return this.engine.kind;
  }

  get available(): boolean {
    return true;
  }

  private async withFallback<T>(run: (engine: MarketDataEngine) => Promise<T>): Promise<T> {
    if (this.demoted || this.engine.kind === 'ts') {
      return run(this.engine);
    }

    try {
      return await run(this.engine);
    } catch (error) {
      if (!this.demoted) {
        this.demoted = true;
        this.engine.close();
        this.engine = new SimulatorEngine(this.registry);
        this.onDemote?.(
          `Market engine fell back to the TypeScript simulator: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      return run(this.engine);
    }
  }

  getIndices(): Promise<IndexQuote[]> {
    return this.withFallback((engine) => engine.getIndices());
  }

  getQuotes(symbols: string[]): Promise<StockQuote[]> {
    return this.withFallback((engine) => engine.getQuotes(symbols));
  }

  newGameRound(exclude?: string[]): Promise<GameRound> {
    return this.withFallback((engine) => engine.newGameRound(exclude));
  }

  close(): void {
    this.engine.close();
  }
}

export type { EngineRegistry, GameRound, IndexQuote, MarketDataEngine, StockQuote };