/**
 * Allowed enums per the AffordMed evaluation specification.
 * Any value outside these sets MUST be rejected client-side before the network call.
 */

export const ALLOWED_STACKS = ['backend', 'frontend'] as const;
export type Stack = (typeof ALLOWED_STACKS)[number];

export const ALLOWED_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
export type Level = (typeof ALLOWED_LEVELS)[number];

/**
 * Backend-only package values. Frontend has its own list, but this middleware
 * is intended for the backend track of the evaluation.
 */
export const ALLOWED_BACKEND_PACKAGES = [
  'cache',
  'controller',
  'cron_job',
  'db',
  'domain',
  'handler',
  'repository',
  'route',
  'service',
  'auth',
  'config',
  'middleware',
  'utils',
] as const;
export type BackendPackage = (typeof ALLOWED_BACKEND_PACKAGES)[number];

/**
 * Frontend packages — kept here for completeness so the same middleware can be
 * reused in a frontend project simply by switching the stack value.
 */
export const ALLOWED_FRONTEND_PACKAGES = [
  'api',
  'component',
  'hook',
  'page',
  'state',
  'style',
  'auth',
  'config',
  'middleware',
  'utils',
] as const;
export type FrontendPackage = (typeof ALLOWED_FRONTEND_PACKAGES)[number];

export const PATHS = {
  REGISTER: '/register',
  AUTH: '/auth',
  LOGS: '/logs',
} as const;

/** Token is refreshed this many milliseconds before its real expiry. */
export const TOKEN_EXPIRY_SAFETY_BUFFER_MS = 30_000;
