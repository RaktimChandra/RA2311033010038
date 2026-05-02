import { Log } from '@affordmed/logging-middleware';
import { createApp } from './app';
import { config } from './config';

const app = createApp();

const server = app.listen(config.port, async () => {
  await Log(
    'backend',
    'info',
    'service',
    `vehicle-maintenance-scheduler listening on :${config.port} (${config.nodeEnv})`,
  );
  // eslint-disable-next-line no-console
  console.log(`Server up at http://localhost:${config.port}/api/v1/health`);
});

const shutdown = async (signal: string): Promise<void> => {
  await Log('backend', 'warn', 'service', `Received ${signal}, shutting down`);
  server.close(() => process.exit(0));
  // Force exit if close hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  void Log(
    'backend',
    'fatal',
    'service',
    `unhandledRejection: ${reason instanceof Error ? reason.message : String(reason)}`,
  );
});

process.on('uncaughtException', (err) => {
  void Log('backend', 'fatal', 'service', `uncaughtException: ${err.message}`);
});
