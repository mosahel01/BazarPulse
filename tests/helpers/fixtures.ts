import type { FastifyInstance } from 'fastify';
import type { DatabaseHandle } from '../../src/db/client.js';
import { stocks } from '../../src/db/schema.js';

export interface SeedStock {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  description?: string;
}

export function seedStocks(database: DatabaseHandle, rows: SeedStock[]): void {
  database.db
    .insert(stocks)
    .values(rows.map((row) => ({ ...row, description: row.description ?? null })))
    .run();
}

export async function registerUser(app: FastifyInstance, username: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      username,
      email: `${username}@example.com`,
      password: 'Password123!',
    },
  });
  if (response.statusCode !== 201) {
    throw new Error(`registerUser failed: ${response.statusCode} ${response.body}`);
  }
  return response.json().data.token as string;
}

export function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

export const seedStocksFixture: SeedStock[] = [
  { symbol: 'TCS', companyName: 'Tata Consultancy Services', exchange: 'NSE', sector: 'IT Services' },
  { symbol: 'RELIANCE', companyName: 'Reliance Industries', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'HDFCBANK', companyName: 'HDFC Bank', exchange: 'NSE', sector: 'Banking' },
];