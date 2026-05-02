import {
  ALLOWED_BACKEND_PACKAGES,
  ALLOWED_FRONTEND_PACKAGES,
  ALLOWED_LEVELS,
  ALLOWED_STACKS,
  BackendPackage,
  FrontendPackage,
  Level,
  Stack,
} from '../constants';
import { LogPayload, LoggerValidationError } from '../types';

/**
 * Strictly validates a log payload against the AffordMed enum specification.
 * The server rejects invalid values, so we fail fast with a clear local error
 * instead of paying a network round-trip for each typo.
 */
export function validateLogPayload(payload: LogPayload): void {
  if (!payload || typeof payload !== 'object') {
    throw new LoggerValidationError('Log payload must be an object.');
  }

  const { stack, level, package: pkg, message } = payload;

  if (!ALLOWED_STACKS.includes(stack as Stack)) {
    throw new LoggerValidationError(
      `Invalid stack "${String(stack)}". Allowed: ${ALLOWED_STACKS.join(', ')}`,
    );
  }

  if (!ALLOWED_LEVELS.includes(level as Level)) {
    throw new LoggerValidationError(
      `Invalid level "${String(level)}". Allowed: ${ALLOWED_LEVELS.join(', ')}`,
    );
  }

  const allowedPkgs =
    stack === 'backend'
      ? (ALLOWED_BACKEND_PACKAGES as readonly string[])
      : (ALLOWED_FRONTEND_PACKAGES as readonly string[]);

  if (!allowedPkgs.includes(pkg as BackendPackage | FrontendPackage)) {
    throw new LoggerValidationError(
      `Invalid package "${String(pkg)}" for stack "${stack}". Allowed: ${allowedPkgs.join(', ')}`,
    );
  }

  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new LoggerValidationError('message must be a non-empty string.');
  }

  if (message.length > 2000) {
    throw new LoggerValidationError('message must be <= 2000 characters.');
  }
}
