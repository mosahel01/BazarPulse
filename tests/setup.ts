process.env.NODE_ENV = 'test';
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? 'test-auth-secret-0123456789abcdef';
process.env.SQLITE_DATABASE_PATH = process.env.SQLITE_DATABASE_PATH ?? './data/test-marketpulse.db';
process.env.MARKET_ENGINE = 'ts';
