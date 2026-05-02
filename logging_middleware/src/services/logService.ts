import { AxiosError, AxiosInstance } from 'axios';
import { TokenManager } from '../auth/tokenManager';
import { PATHS } from '../constants';
import {
  LogPayload,
  LogResponse,
  LoggerConfig,
  LoggerTransportError,
} from '../types';

/**
 * LogService is the thin transport layer that owns the actual POST /logs call.
 * It transparently retries once with a fresh token on 401, then surfaces a
 * typed transport error for the caller (which is wrapped further by Logger).
 */
export class LogService {
  constructor(
    private readonly http: AxiosInstance,
    private readonly tokens: TokenManager,
    private readonly config: LoggerConfig,
  ) {}

  public async send(payload: LogPayload): Promise<LogResponse> {
    return this.sendWithAuthRetry(payload, /* alreadyRetried */ false);
  }

  private async sendWithAuthRetry(
    payload: LogPayload,
    alreadyRetried: boolean,
  ): Promise<LogResponse> {
    const token = await this.tokens.getToken();

    try {
      const { data } = await this.http.post<LogResponse>(PATHS.LOGS, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    } catch (error) {
      const status = (error as AxiosError)?.response?.status;

      // Refresh exactly once on auth failures — covers expired tokens between
      // proactive refresh windows.
      if (status === 401 && !alreadyRetried) {
        await this.tokens.refresh();
        return this.sendWithAuthRetry(payload, true);
      }

      const message =
        (error as AxiosError<{ message?: string }>)?.response?.data?.message ??
        (error instanceof Error ? error.message : String(error));

      throw new LoggerTransportError(
        `POST ${PATHS.LOGS} failed${status ? ` (HTTP ${status})` : ''}: ${message}`,
        error,
      );
    }
  }
}
