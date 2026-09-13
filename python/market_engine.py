#!/usr/bin/env python3
"""MarketPulse market-data engine.

A small long-running worker that talks to the Node/Typecript backend over
stdio using newline-delimited JSON (one JSON object per line):

  Node -> Python: {"id": 1, "method": "indices", "params": {}}
  Python -> Node: {"id": 1, "result": {...}}
  Python -> Node: {"id": 1, "error": {"code": "INTERNAL", "message": "..."}}

Everything here is a *fictional, deterministic simulation* for demo purposes.
No live market data, no network access, no third-party dependencies. The same
formulas are mirrored in the TypeScript fallback simulator so the backend can
run with or without Python and still agree on the numbers.

Supported methods:
  init        - bootstrap the engine with the stock/index registry
  indices     - daily index values (stable within a calendar day)
  quotes      - simulated prices for the given symbols (stable within a day)
  game_round  - pick a random stock and a simulated next move for the
                prediction game (random every call)

All values are fictional demo data, not financial advice.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
import time
from typing import Any, Dict, List, Optional

DAY_SECONDS = 86_400

# Hashing ####################################################################

def fnv1a32(data: str) -> int:
    """32-bit FNV-1a hash. Must match the helper used in the TS fallback."""
    h = 0x811C9DC5
    for byte in data.encode('utf-8'):
        h ^= byte
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def _scaled_hash(key: str) -> float:
    """Deterministic value in [-0.5, 0.5) derived from `key`."""
    return ((fnv1a32(key) % 10_000) / 10_000.0) - 0.5


def _round2(value: float) -> float:
    return math.floor(value * 100 + 0.5) / 100


def _round4(value: float) -> float:
    return math.floor(value * 10_000 + 0.5) / 10_000


# Simulation math #############################################################

def _daily_ret(symbol: str, day: int, mu: float, sigma: float) -> float:
    """Deterministic synthetic daily return for `symbol` on `day`."""
    noise = _scaled_hash(f"{symbol}:{day}")
    return mu + 2.0 * sigma * noise


def _today_quotes(registry: Dict[str, Any]) -> List[Dict[str, Any]]:
    day = math.floor(time.time() / DAY_SECONDS)
    quotes = []
    for stock in registry['stocks']:
        symbol = stock['symbol']
        ret = _daily_ret(symbol, day, 0.0002, stock['volatility'])
        base = stock['basePrice']
        price = _round2(base * (1.0 + ret))
        change = _round2(price - base)
        change_pct = None if base == 0 else _round4((price - base) / base * 100.0)
        quotes.append({
            'symbol': symbol,
            'price': price,
            'change': change,
            'changePct': change_pct,
        })
    return quotes


def _today_indices(registry: Dict[str, Any]) -> List[Dict[str, Any]]:
    day = math.floor(time.time() / DAY_SECONDS)
    indices = []
    for index in registry['indices']:
        name = index['name']
        ret = _daily_ret(name, day, 0.0003, index['volatility'])
        base = index['baseValue']
        value = _round2(base * (1.0 + ret))
        change = _round2(value - base)
        change_pct = _round4((value - base) / base * 100.0)
        indices.append({'name': name, 'value': value, 'change': change, 'changePct': change_pct})
    return indices


def _game_round(registry: Dict[str, Any], exclude: Optional[List[str]]) -> Dict[str, Any]:
    import random

    rng = random.Random()
    exclude_set = set(exclude or [])
    pool = [s for s in registry['stocks'] if s['symbol'] not in exclude_set]
    if not pool:
        pool = registry['stocks']
    if not pool:
        raise ValueError('no stocks registered')

    stock = rng.choice(pool)
    base = float(stock['basePrice'])
    start_price = _round2(base * (1.0 + _daily_ret(stock['symbol'], math.floor(time.time() / DAY_SECONDS), 0.0002, stock['volatility'])))
    direction = 1.0 if rng.random() < 0.52 else -1.0
    magnitude = rng.uniform(0.003, 0.03)
    end_price = _round2(start_price * (1.0 + direction * magnitude))
    change = _round2(end_price - start_price)
    change_pct = _round4(change / start_price * 100.0) if start_price else 0.0

    return {
        'symbol': stock['symbol'],
        'companyName': stock['companyName'],
        'sector': stock['sector'],
        'startPrice': start_price,
        'endPrice': end_price,
        'change': change,
        'changePct': change_pct,
    }


# Protocol ###################################################################

class MarketEngineError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


class MarketEngine:
    def __init__(self) -> None:
        self.registry: Dict[str, Any] = {'stocks': [], 'indices': []}

    def handle(self, method: str, params: Dict[str, Any]) -> Any:
        if method == 'init':
            self.registry = {
                'stocks': list(params.get('stocks', [])),
                'indices': list(params.get('indices', [])),
            }
            return {'initialized': len(self.registry['stocks'])}
        if method == 'indices':
            return {'indices': _today_indices(self.registry)}
        if method == 'quotes':
            symbols = params.get('symbols') if isinstance(params.get('symbols'), list) else []
            all_quotes = _today_quotes(self.registry)
            if not symbols:
                return {'quotes': all_quotes}
            wanted = set(symbols)
            return {'quotes': [q for q in all_quotes if q['symbol'] in wanted]}
        if method == 'game_round':
            return {'round': _game_round(self.registry, params.get('exclude'))}
        raise MarketEngineError('UNKNOWN_METHOD', f'unknown method: {method}')


def main() -> None:
    engine = MarketEngine()
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            message = json.loads(line)
        except json.JSONDecodeError as exc:
            sys.stdout.write(json.dumps({'error': {'code': 'BAD_REQUEST', 'message': str(exc)}}) + '\n')
            sys.stdout.flush()
            continue

        request_id = message.get('id')
        method = message.get('method')
        params = message.get('params') or {}

        if method == 'shutdown':
            sys.stdout.write(json.dumps({'id': request_id, 'result': {'ok': True}}) + '\n')
            sys.stdout.flush()
            break

        try:
            result = engine.handle(method, params)
            payload = {'id': request_id, 'result': result}
        except Exception as exc:  # noqa: BLE001 - boundary: report everything back
            code = exc.code if isinstance(exc, MarketEngineError) else 'INTERNAL'
            payload = {'id': request_id, 'error': {'code': code, 'message': str(exc)}}

        sys.stdout.write(json.dumps(payload) + '\n')
        sys.stdout.flush()


if __name__ == '__main__':
    main()