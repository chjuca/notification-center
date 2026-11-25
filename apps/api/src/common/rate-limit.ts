import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

const ONE_MINUTE = 60_000;

export const DEFAULT_RATE_LIMIT: RateLimitOptions = {
  limit: 100,
  windowMs: ONE_MINUTE,
};

export const AUTH_RATE_LIMIT: RateLimitOptions = {
  limit: 5,
  windowMs: ONE_MINUTE,
};

export const RATE_LIMIT_KEY = 'rateLimit';

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
