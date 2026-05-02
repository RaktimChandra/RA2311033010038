import axios, { AxiosError, AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { LoggerConfig } from '../types';

/**
 * Builds a single axios instance configured with:
 *  - base URL pointing at the evaluation service
 *  - exponential-backoff retry on network errors and 5xx
 *  - JSON content type
 *
 * The token interceptor is attached separately by TokenManager to keep
 * concerns isolated and to avoid a circular import.
 */
export function buildHttpClient(config: LoggerConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseUrl,
    timeout: config.httpTimeoutMs,
    headers: { 'Content-Type': 'application/json' },
  });

  axiosRetry(client, {
    retries: config.maxRetries,
    retryDelay: (retryCount: number) =>
      config.retryBaseDelayMs * Math.pow(2, retryCount - 1),
    retryCondition: (error: AxiosError) => {
      // Retry on transient network errors and 5xx server errors only.
      // 4xx (e.g. validation, unauthorized) should fail fast.
      return (
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        (error.response?.status !== undefined && error.response.status >= 500)
      );
    },
  });

  return client;
}
