import { env } from './env.js';

export interface LoggerOptions {
  level: string;
  transport?: { target: string; options: { colorize: boolean } };
}

export interface AppConfig {
  isProduction: boolean;
  isTest: boolean;
  logger: LoggerOptions;
}

export const config: AppConfig = {
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  logger: {
    level: env.LOG_LEVEL,
    ...(env.NODE_ENV === 'development' && env.LOG_LEVEL !== 'silent'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  },
};
