import type { TestingModuleBuilder } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';

export function withoutThrottling(
  builder: TestingModuleBuilder,
): TestingModuleBuilder {
  return builder
    .overrideProvider(ThrottlerGuard)
    .useValue({ canActivate: () => true });
}
