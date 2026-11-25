import type { TestingModuleBuilder } from '@nestjs/testing';
import { RateLimitGuard } from '../../src/common/rate-limit.guard.js';

export function withoutThrottling(
  builder: TestingModuleBuilder,
): TestingModuleBuilder {
  return builder
    .overrideProvider(RateLimitGuard)
    .useValue({ canActivate: () => true });
}
