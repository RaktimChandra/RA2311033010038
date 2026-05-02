import { TokenManager } from './auth/tokenManager';
import { loadConfigFromEnv } from './config';
import { BackendPackage, FrontendPackage, Level, Stack } from './constants';
import { LogService } from './services/logService';
import { LogPayload, LogResponse, LoggerConfig } from './types';
import { buildHttpClient } from './utils/httpClient';
import { validateLogPayload } from './utils/validator';

export class Logger {
  private constructor(
    private readonly service: LogService,
    private readonly config: LoggerConfig,
    private readonly tokens: TokenManager,
  ) {}

  public static create(overrides: Partial<LoggerConfig> = {}): Logger {
    const config = loadConfigFromEnv(overrides);
    const http = buildHttpClient(config);
    const tokens = new TokenManager(http, config);
    const service = new LogService(http, tokens, config);
    return new Logger(service, config, tokens);
  }

  public async getAuthToken(): Promise<string> {
    return this.tokens.getToken();
  }

  public async log(
    stack: Stack,
    level: Level,
    pkg: BackendPackage | FrontendPackage,
    message: string,
  ): Promise<LogResponse | null> {
    const payload: LogPayload = { stack, level, package: pkg, message };
    try {
      validateLogPayload(payload);
      const response = await this.service.send(payload);
      this.mirrorToConsole(payload, response.logID);
      return response;
    } catch (error) {
      this.mirrorFailureToConsole(payload, error);
      return null;
    }
  }

  public async logStrict(
    stack: Stack,
    level: Level,
    pkg: BackendPackage | FrontendPackage,
    message: string,
  ): Promise<LogResponse> {
    const payload: LogPayload = { stack, level, package: pkg, message };
    validateLogPayload(payload);
    const response = await this.service.send(payload);
    this.mirrorToConsole(payload, response.logID);
    return response;
  }

  private mirrorToConsole(payload: LogPayload, logID: string): void {
    if (this.config.silentConsole) return;
    const ts = new Date().toISOString();
    console.log(
      `[${ts}] [${payload.level.toUpperCase()}] [${payload.stack}/${payload.package}] ${payload.message} (logID=${logID})`,
    );
  }

  private mirrorFailureToConsole(payload: LogPayload, error: unknown): void {
    if (this.config.silentConsole) return;
    const ts = new Date().toISOString();
    const reason = error instanceof Error ? error.message : String(error);
    console.error(
      `[${ts}] [LOGGER-FAILURE] Could not ship log (${payload.stack}/${payload.level}/${payload.package}): ${reason} | original message="${payload.message}"`,
    );
  }
}

let singleton: Logger | null = null;

function getSingleton(): Logger {
  if (!singleton) singleton = Logger.create();
  return singleton;
}

export async function Log(
  stack: Stack,
  level: Level,
  pkg: BackendPackage | FrontendPackage,
  message: string,
): Promise<LogResponse | null> {
  return getSingleton().log(stack, level, pkg, message);
}

export async function getAuthToken(): Promise<string> {
  return getSingleton().getAuthToken();
}

export function __setLoggerSingletonForTests(instance: Logger | null): void {
  singleton = instance;
}
