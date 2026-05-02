import axios, { AxiosError, AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { Log, getAuthToken } from '@affordmed/logging-middleware';
import { config } from '../config';
import { UpstreamFetchError } from '../types';

export const upstreamHttp: AxiosInstance = axios.create({
  baseURL: config.upstream.baseUrl,
  timeout: config.upstream.timeoutMs,
  headers: { Accept: 'application/json' },
});

axiosRetry(upstreamHttp, {
  retries: config.upstream.maxRetries,
  retryDelay: (retryCount: number) => 250 * Math.pow(2, retryCount - 1),
  retryCondition: (error: AxiosError) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    (error.response?.status !== undefined && error.response.status >= 500),
  onRetry: (retryCount: number, error: AxiosError) => {
    void Log(
      'backend',
      'warn',
      'utils',
      `Upstream retry ${retryCount} for ${error.config?.url ?? '?'}: ${error.message}`,
    );
  },
});

export async function getJson<T>(path: string, label: string): Promise<T> {
  await Log('backend', 'info', 'service', `Fetching ${label} from upstream ${path}`);
  try {
    const token = await getAuthToken();
    const { data } = await upstreamHttp.get<T>(path, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await Log('backend', 'info', 'service', `Fetched ${label} successfully`);
    return data;
  } catch (error) {
    const axiosErr = error as AxiosError<{ message?: string }>;
    const status = axiosErr?.response?.status;
    const reason =
      axiosErr?.response?.data?.message ??
      (error instanceof Error ? error.message : String(error));
    await Log(
      'backend',
      'error',
      'repository',
      `Upstream ${label} fetch failed${status ? ` (HTTP ${status})` : ''}: ${reason}`,
    );
    throw new UpstreamFetchError(`Failed to fetch ${label}: ${reason}`, status);
  }
}
