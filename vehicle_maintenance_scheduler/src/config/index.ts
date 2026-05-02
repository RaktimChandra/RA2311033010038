import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  upstream: {
    baseUrl: string;
    timeoutMs: number;
    maxRetries: number;
  };
}

const num = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const config: AppConfig = {
  port: num(process.env.PORT, 3000),
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
  upstream: {
    baseUrl:
      process.env.EVAL_API_BASE_URL ?? 'http://20.207.122.201/evaluation-service',
    timeoutMs: num(process.env.UPSTREAM_TIMEOUT_MS, 8000),
    maxRetries: num(process.env.UPSTREAM_MAX_RETRIES, 3),
  },
};
