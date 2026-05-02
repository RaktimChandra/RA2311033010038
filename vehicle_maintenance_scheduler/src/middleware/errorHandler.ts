import { NextFunction, Request, Response } from 'express';
import { Log } from '@affordmed/logging-middleware';
import { UpstreamFetchError, ValidationError } from '../types';

/**
 * 404 handler — keep last in the chain.
 */
export function notFoundHandler(req: Request, res: Response): void {
  void Log('backend', 'warn', 'middleware', `404 ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found.` },
  });
}

/**
 * Centralised error handler. Maps domain errors to HTTP statuses and ships
 * a consistent error envelope to the client.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof ValidationError) {
    void Log('backend', 'warn', 'handler', `Validation error on ${req.originalUrl}: ${err.message}`);
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message },
    });
    return;
  }

  if (err instanceof UpstreamFetchError) {
    void Log('backend', 'error', 'handler', `Upstream failure on ${req.originalUrl}: ${err.message}`);
    res.status(502).json({
      success: false,
      error: { code: 'UPSTREAM_FAILURE', message: err.message },
    });
    return;
  }

  void Log('backend', 'fatal', 'handler', `Unhandled error on ${req.originalUrl}: ${err.message}`);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' },
  });
}
