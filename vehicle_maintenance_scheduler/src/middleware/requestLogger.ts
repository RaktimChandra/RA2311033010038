import { NextFunction, Request, Response } from 'express';
import { Log } from '@affordmed/logging-middleware';

/**
 * Express middleware that logs an entry for every incoming request and a
 * matching exit log on response close, including status and duration.
 * Both calls hit the AffordMed logging API as the spec requires.
 */
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    void Log(
      'backend',
      'info',
      'middleware',
      `IN  ${req.method} ${req.originalUrl}`,
    );

    res.on('finish', () => {
      const elapsed = Date.now() - start;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      void Log(
        'backend',
        level,
        'middleware',
        `OUT ${req.method} ${req.originalUrl} -> ${res.statusCode} (${elapsed}ms)`,
      );
    });

    next();
  };
}
