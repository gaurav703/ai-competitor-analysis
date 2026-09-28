import { isIP } from 'node:net';
import dns from 'node:dns/promises';

// SSRF guard for user-provided URLs (SYSTEM_DESIGN §13 security): block requests to private,
// loopback and link-local addresses before fetching. Checked against the resolved IP, not just
// the hostname, so "http://evil.example.com" resolving to 127.0.0.1 is still caught.

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  const [a, b] = parts;
  if (a === undefined || b === undefined) return true; // malformed - treat as unsafe
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' || // loopback
    lower.startsWith('fe80:') || // link-local
    lower.startsWith('fc') || // unique local fc00::/7
    lower.startsWith('fd')
  );
}

export class UnsafeUrlError extends Error {
  constructor(url: string, reason: string) {
    super(`Refusing to fetch ${url}: ${reason}`);
    this.name = 'UnsafeUrlError';
  }
}

export async function assertSafeUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError(rawUrl, 'not a valid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError(rawUrl, `unsupported protocol ${url.protocol}`);
  }

  const hostname = url.hostname;
  if (hostname === 'localhost') throw new UnsafeUrlError(rawUrl, 'localhost is blocked');

  const directIpVersion = isIP(hostname);
  const addresses =
    directIpVersion !== 0
      ? [hostname]
      : await dns.resolve(hostname).catch(() => {
          throw new UnsafeUrlError(rawUrl, 'could not resolve host');
        });

  for (const addr of addresses) {
    const version = isIP(addr);
    const isPrivate =
      version === 4 ? isPrivateIPv4(addr) : version === 6 ? isPrivateIPv6(addr) : true;
    if (isPrivate)
      throw new UnsafeUrlError(rawUrl, `resolves to a private/internal address (${addr})`);
  }
}
