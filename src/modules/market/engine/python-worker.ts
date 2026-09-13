import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  EngineRegistry,
  GameRound,
  IndexQuote,
  MarketDataEngine,
  StockQuote,
} from './types.js';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(CURRENT_DIR, '..', '..', '..', '..');

/** Absolute path to the Python market-data worker. */
export const PYTHON_SCRIPT_PATH = join(PROJECT_ROOT, 'python', 'market_engine.py');

export function pythonEngineAvailable(): boolean {
  return existsSync(PYTHON_SCRIPT_PATH) && resolvePythonCommand() !== null;
}

let resolvedPythonCommand: string | null | undefined;

/** Lazily probe which Python binary actually runs, then cache the answer. */
function resolvePythonCommand(): string | null {
  if (resolvedPythonCommand !== undefined) {
    return resolvedPythonCommand;
  }
  resolvedPythonCommand = null;
  for (const candidate of ['python3', 'python']) {
    try {
      const probe = spawnSync(candidate, ['-c', 'print("ok")'], {
        timeout: 5_000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      if (probe.status === 0) {
        resolvedPythonCommand = candidate;
        break;
      }
    } catch {
      // keep probing the next candidate
    }
  }
  return resolvedPythonCommand;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

interface EngineResponse<T = unknown> {
  id?: number;
  result?: T;
  error?: { code: string; message: string };
}

/**
 * Persistent Python worker speaking a one-line JSON protocol over stdio.
 *
 * The protocol is intentionally minimal:
 *   request:  {"id": 1, "method": "indices", "params": {}}
 *   response: {"id": 1, "result": {...}} | {"id": 1, "error": {...}}
 *
 * The engine is lazy: the worker is only spawned when the first request
 * arrives, so an app that never touches market data pays no Python cost.
 */
export class PythonWorkerEngine implements MarketDataEngine {
  readonly kind = 'python' as const;
  readonly available: boolean = pythonEngineAvailable();

  private child: ChildProcessWithoutNullStreams | null = null;
  private buffer = '';
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private closed = false;

  constructor(private readonly registry: EngineRegistry) {}

  private spawnPython(): ChildProcessWithoutNullStreams {
    const command = resolvePythonCommand();
    if (!command) {
      throw new Error('Market engine (Python): no Python interpreter found.');
    }

    const child = spawn(command, [PYTHON_SCRIPT_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
    }) as ChildProcessWithoutNullStreams;

    child.once('error', (spawnError) => {
      this.rejectAll(new Error(`Market engine (Python): ${spawnError.message}`));
    });

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      this.buffer += chunk;
      let newlineIndex = this.buffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = this.buffer.slice(0, newlineIndex).trim();
        this.buffer = this.buffer.slice(newlineIndex + 1);
        if (line) {
          this.handleLine(line);
        }
        newlineIndex = this.buffer.indexOf('\n');
      }
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      process.stderr.write(`[market-engine:python] ${chunk}`);
    });

    child.on('exit', (code) => {
      if (code !== 0 && !this.closed) {
        this.rejectAll(new Error(`Market engine (Python): exited with code ${String(code)}`));
      }
      this.child = null;
    });

    return child;
  }

  private async withWorker<T>(method: string, params: unknown): Promise<T> {
    if (this.closed) {
      throw new Error('Market engine (Python) is closed.');
    }

    if (!this.child) {
      const child = this.spawnPython();
      this.child = child;
      await this.handshake(child);
    }

    const id = this.nextId++;
    const child = this.child;
    return new Promise<T>((resolvePromise, reject) => {
      this.pending.set(id, {
        resolve: resolvePromise as (value: unknown) => void,
        reject,
      });
      child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    });
  }

  private async handshake(child: ChildProcessWithoutNullStreams): Promise<void> {
    const id = this.nextId++;
    const response = new Promise<void>((resolvePromise, reject) => {
      this.pending.set(id, {
        resolve: () => resolvePromise(),
        reject: (reason) => reject(reason),
      });
      child.stdin.write(
        `${JSON.stringify({ id, method: 'init', params: this.registryPayload() })}\n`,
      );
    });

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Market engine (Python): handshake timed out.')),
        5_000,
      );
    });

    await Promise.race([response, timeout]);
  }

  private registryPayload(): { stocks: EngineRegistry['stocks']; indices: EngineRegistry['indices'] } {
    return { stocks: this.registry.stocks, indices: this.registry.indices };
  }

  private handleLine(line: string): void {
    let parsed: EngineResponse;
    try {
      parsed = JSON.parse(line) as EngineResponse;
    } catch {
      return;
    }

    if (parsed.id === undefined) {
      return;
    }
    const pending = this.pending.get(parsed.id);
    if (!pending) {
      return;
    }
    this.pending.delete(parsed.id);

    if (parsed.error) {
      pending.reject(new Error(`${parsed.error.code}: ${parsed.error.message}`));
      return;
    }
    pending.resolve(parsed.result);
  }

  private rejectAll(error: Error): void {
    const entries = [...this.pending.entries()];
    this.pending.clear();
    for (const [, pending] of entries) {
      pending.reject(error);
    }
  }

  async getIndices(): Promise<IndexQuote[]> {
    const { indices } = await this.withWorker<{ indices: IndexQuote[] }>('indices', {});
    return indices;
  }

  async getQuotes(symbols: string[]): Promise<StockQuote[]> {
    const { quotes } = await this.withWorker<{ quotes: StockQuote[] }>('quotes', { symbols });
    return quotes;
  }

  async newGameRound(exclude: string[] = []): Promise<GameRound> {
    const { round } = await this.withWorker<{ round: GameRound }>('game_round', { exclude });
    return round;
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    const child = this.child;
    this.child = null;
    if (child && child.exitCode === null) {
      try {
        child.stdin.write(`${JSON.stringify({ id: this.nextId++, method: 'shutdown', params: {} })}\n`);
      } catch {
        // worker is already gone
      }
      const timer = setTimeout(() => child.kill(), 500);
      timer.unref();
    }
  }
}