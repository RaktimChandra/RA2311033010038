import { AxiosInstance } from 'axios';
import { PATHS, TOKEN_EXPIRY_SAFETY_BUFFER_MS } from '../constants';
import { AuthResponse, LoggerAuthError, LoggerConfig } from '../types';

/**
 * TokenManager owns the bearer-token lifecycle:
 *  - lazy-fetches a token on first use
 *  - caches it in memory
 *  - refreshes proactively before expiry
 *  - serialises concurrent refreshes via a single in-flight promise so we
 *    never hammer /auth from multiple call sites simultaneously.
 */
export class TokenManager {
  private token: string | null = null;
  private expiresAtEpochMs: number = 0;
  private inFlight: Promise<string> | null = null;

  constructor(
    private readonly http: AxiosInstance,
    private readonly config: LoggerConfig,
  ) {}

  /** Returns a valid access_token, fetching/refreshing when needed. */
  public async getToken(forceRefresh = false): Promise<string> {
    const now = Date.now();
    const tokenIsValid =
      this.token !== null && now < this.expiresAtEpochMs - TOKEN_EXPIRY_SAFETY_BUFFER_MS;

    if (!forceRefresh && tokenIsValid) {
      return this.token as string;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.fetchNewToken().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  /** Forces a refresh — typically called after a 401 from /logs. */
  public async refresh(): Promise<string> {
    return this.getToken(true);
  }

  private async fetchNewToken(): Promise<string> {
    const body = {
      email: this.config.email,
      name: this.config.name,
      rollNo: this.config.rollNo,
      accessCode: this.config.accessCode,
      clientID: this.config.clientID,
      clientSecret: this.config.clientSecret,
    };

    try {
      const { data } = await this.http.post<AuthResponse>(PATHS.AUTH, body);

      if (!data?.access_token) {
        throw new LoggerAuthError('Auth response did not contain access_token.');
      }

      this.token = data.access_token;
      // expires_in is seconds. Default to 1 hour if missing.
      const ttlMs = (data.expires_in ?? 3600) * 1000;
      this.expiresAtEpochMs = Date.now() + ttlMs;

      return this.token;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new LoggerAuthError(`Failed to obtain auth token: ${reason}`);
    }
  }
}
