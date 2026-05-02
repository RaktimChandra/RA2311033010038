import dotenv from 'dotenv';
import { LoggerConfig } from '../types';

dotenv.config();

/**
 * Reads required logger configuration from environment variables.
 * Throws a descriptive error on first missing field so misconfiguration
 * is caught at process start instead of inside hot paths.
 */
export function loadConfigFromEnv(overrides: Partial<LoggerConfig> = {}): LoggerConfig {
  const get = (key: string, fallback?: string): string => {
    const value = process.env[key] ?? fallback;
    if (value === undefined || value === '') {
      throw new Error(`[logging-middleware] Missing required env var: ${key}`);
    }
    return value;
  };

  const numeric = (key: string, fallback: number): number => {
    const raw = process.env[key];
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    baseUrl: overrides.baseUrl ?? get('LOG_API_BASE_URL', 'http://20.207.122.201/evaluation-service'),
    email: overrides.email ?? get('LOG_EMAIL'),
    name: overrides.name ?? get('LOG_NAME'),
    rollNo: overrides.rollNo ?? get('LOG_ROLL_NO'),
    accessCode: overrides.accessCode ?? get('LOG_ACCESS_CODE'),
    clientID: overrides.clientID ?? get('LOG_CLIENT_ID'),
    clientSecret: overrides.clientSecret ?? get('LOG_CLIENT_SECRET'),
    httpTimeoutMs: overrides.httpTimeoutMs ?? numeric('LOG_HTTP_TIMEOUT_MS', 5000),
    maxRetries: overrides.maxRetries ?? numeric('LOG_MAX_RETRIES', 3),
    retryBaseDelayMs: overrides.retryBaseDelayMs ?? numeric('LOG_RETRY_BASE_DELAY_MS', 300),
    silentConsole:
      overrides.silentConsole ?? (process.env.LOG_SILENT_CONSOLE ?? 'false').toLowerCase() === 'true',
  };
}
