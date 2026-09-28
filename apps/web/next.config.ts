import { resolve } from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// One .env at the repo root is shared by web, worker and db tooling.
// forceReload=true: Next's dev server already calls loadEnvConfig() once for this
// app's own directory (which has no .env files) before next.config.ts runs, and
// @next/env caches that empty result process-wide. Without forcing a reload here,
// this call just returns the cached (empty) result instead of reading the root .env.
loadEnvConfig(resolve(import.meta.dirname, '../..'), undefined, undefined, true);

const nextConfig: NextConfig = {
  // Server-only packages that shouldn't be bundled.
  serverExternalPackages: ['postgres'],
};

export default nextConfig;
