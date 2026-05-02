/**
 * Smoke test — fires one log of every level so you can verify the middleware
 * end-to-end against the real evaluation API.
 *
 *   npm run test:smoke
 */
import { Log } from './index';

async function main(): Promise<void> {
  const cases: Array<[Parameters<typeof Log>[1], string]> = [
    ['debug', 'smoke debug from logging-middleware'],
    ['info', 'smoke info from logging-middleware'],
    ['warn', 'smoke warn from logging-middleware'],
    ['error', 'smoke error from logging-middleware'],
    ['fatal', 'smoke fatal from logging-middleware'],
  ];

  for (const [level, message] of cases) {
    const result = await Log('backend', level, 'utils', message);
    // eslint-disable-next-line no-console
    console.log(`-> ${level}:`, result?.logID ?? 'FAILED');
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
