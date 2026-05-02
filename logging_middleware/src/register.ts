/**
 * One-shot helper to call POST /register and print the clientID / clientSecret
 * the rest of the system needs in its .env files.
 *
 *   ts-node src/register.ts \
 *     --email raktimchandra26@gmail.com \
 *     --name "Raktim Chandra" \
 *     --mobile 9999999999 \
 *     --github your-github-username \
 *     --roll RA2311033010038 \
 *     --access QkbpxH
 */
import axios from 'axios';

interface Args {
  email: string;
  name: string;
  mobileNo: string;
  githubUsername: string;
  rollNo: string;
  accessCode: string;
  baseUrl: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };

  const args: Args = {
    email: get('--email') ?? process.env.LOG_EMAIL ?? '',
    name: get('--name') ?? process.env.LOG_NAME ?? '',
    mobileNo: get('--mobile') ?? '9999999999',
    githubUsername: get('--github') ?? '',
    rollNo: get('--roll') ?? process.env.LOG_ROLL_NO ?? '',
    accessCode: get('--access') ?? process.env.LOG_ACCESS_CODE ?? '',
    baseUrl:
      get('--base') ??
      process.env.LOG_API_BASE_URL ??
      'http://20.207.122.201/evaluation-service',
  };

  for (const [k, v] of Object.entries(args)) {
    if (!v) {
      throw new Error(`Missing required argument: ${k}`);
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const url = `${args.baseUrl.replace(/\/$/, '')}/register`;

  const body = {
    email: args.email,
    name: args.name,
    mobileNo: args.mobileNo,
    githubUsername: args.githubUsername,
    rollNo: args.rollNo,
    accessCode: args.accessCode,
  };

  // eslint-disable-next-line no-console
  console.log(`POST ${url}`);
  const { data } = await axios.post(url, body, { timeout: 10_000 });
  // eslint-disable-next-line no-console
  console.log('\nResponse:\n', JSON.stringify(data, null, 2));
  // eslint-disable-next-line no-console
  console.log('\nAdd these to your .env:\n');
  // eslint-disable-next-line no-console
  console.log(`LOG_CLIENT_ID=${data.clientID ?? ''}`);
  // eslint-disable-next-line no-console
  console.log(`LOG_CLIENT_SECRET=${data.clientSecret ?? ''}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Registration failed:', err?.response?.data ?? err.message);
  process.exit(1);
});
