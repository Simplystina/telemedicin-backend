import { ValueTransformer } from 'typeorm';

/**
 * TypeORM bigint transformer.
 * Postgres returns BIGINT as a string in JavaScript to prevent precision loss.
 * This transformer casts it to a number for use in TypeScript logic.
 * 
 * NOTE: Use this only if you are sure that the ID values will not exceed
 * Number.MAX_SAFE_INTEGER (2^53 - 1, approx 9 quadrillion).
 */
export class BigIntTransformer implements ValueTransformer {
  to(value: number | null): string | null {
    if (value === null || value === undefined) return null;
    return value.toString();
  }

  from(value: string | null): number | null {
    if (value === null || value === undefined) return null;
    const res = parseInt(value, 10);
    return isNaN(res) ? null : res;
  }
}
