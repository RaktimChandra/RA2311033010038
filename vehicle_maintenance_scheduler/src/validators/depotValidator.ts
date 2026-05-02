import { z } from 'zod';
import { ValidationError } from '../types';

/**
 * Path-param validator for /optimize/depots/:depotId.
 * Coerces from the URL string and asserts a positive integer id.
 */
export const depotIdSchema = z.object({
  depotId: z.coerce.number().int().positive(),
});

export function parseDepotId(input: unknown): number {
  const parsed = depotIdSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(
      `Invalid depotId: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
    );
  }
  return parsed.data.depotId;
}
