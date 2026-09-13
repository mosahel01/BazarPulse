import { AppError } from '../../common/errors/app-error.js';
import type { IdeaDirection } from '../../db/schema.js';

export interface IdeaInput {
  stockSymbol: string;
  direction: IdeaDirection;
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  thesis: string;
}

/**
 * Business rules for a structured trading idea:
 * prices must be positive and the target/stop must be consistent with the
 * declared direction (bullish: higher target, lower stop; bearish: the mirror).
 */
export function validateIdeaPrices(input: IdeaInput): void {
  const { direction, entryPrice, targetPrice, stopLossPrice } = input;

  const errors: Array<{ field: string; message: string }> = [];
  for (const [field, value] of [
    ['entryPrice', entryPrice],
    ['targetPrice', targetPrice],
    ['stopLossPrice', stopLossPrice],
  ] as const) {
    if (value <= 0) {
      errors.push({ field, message: `${field} must be a positive number` });
    }
  }

  if (targetPrice === entryPrice) {
    errors.push({ field: 'targetPrice', message: 'Target must differ from the entry price' });
  }
  if (stopLossPrice === entryPrice) {
    errors.push({ field: 'stopLossPrice', message: 'Stop-loss must differ from the entry price' });
  }

  if (direction === 'BULLISH') {
    if (targetPrice <= entryPrice) {
      errors.push({ field: 'targetPrice', message: 'Bullish target must be above the entry price' });
    }
    if (stopLossPrice >= entryPrice) {
      errors.push({ field: 'stopLossPrice', message: 'Bullish stop-loss must be below the entry price' });
    }
  } else if (direction === 'BEARISH') {
    if (targetPrice >= entryPrice) {
      errors.push({ field: 'targetPrice', message: 'Bearish target must be below the entry price' });
    }
    if (stopLossPrice <= entryPrice) {
      errors.push({ field: 'stopLossPrice', message: 'Bearish stop-loss must be above the entry price' });
    }
  }

  if (errors.length > 0) {
    throw AppError.validation(errors, 'Invalid idea prices');
  }
}