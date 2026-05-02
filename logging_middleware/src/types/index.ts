import { BackendPackage, FrontendPackage, Level, Stack } from '../constants';

export type LogPackage = BackendPackage | FrontendPackage;

export interface LogPayload {
  stack: Stack;
  level: Level;
  package: LogPackage;
  message: string;
}

export interface AuthCredentials {
  email: string;
  name: string;
  rollNo: string;
  accessCode: string;
  clientID: string;
  clientSecret: string;
}

export interface AuthResponse {
  token_type: 'Bearer';
  access_token: string;
  /** Some APIs return expiry as Unix seconds. We treat this as best-effort. */
  expires_in?: number;
}

export interface LogResponse {
  logID: string;
  message: string;
}

export interface LoggerConfig {
  baseUrl: string;
  email: string;
  name: string;
  rollNo: string;
  accessCode: string;
  clientID: string;
  clientSecret: string;
  httpTimeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  silentConsole: boolean;
}

export class LoggerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoggerValidationError';
  }
}

export class LoggerAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoggerAuthError';
  }
}

export class LoggerTransportError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'LoggerTransportError';
  }
}
