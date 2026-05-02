import express, { Application } from 'express';
import { Log } from '@affordmed/logging-middleware';
import apiRouter from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

/**
 * Builds the Express application. Kept separate from server.ts so it can be
 * imported in tests without binding to a port.
 */
export function createApp(): Application {
  const app: Application = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  app.use(requestLogger());

  app.use('/api', apiRouter);

  // 404 + error handlers must be the last middlewares.
  app.use(notFoundHandler);
  app.use(errorHandler);

  void Log('backend', 'info', 'config', 'Express app initialised');
  return app;
}
