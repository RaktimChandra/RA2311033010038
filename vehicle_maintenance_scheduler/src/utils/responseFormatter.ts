/**
 * Tiny helpers to keep the response envelope consistent across endpoints.
 * Kept separate so the controller stays thin.
 */
export const ok = <T>(data: T) => ({ success: true as const, data });
export const fail = (code: string, message: string) => ({
  success: false as const,
  error: { code, message },
});
