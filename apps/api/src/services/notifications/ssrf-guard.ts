import dns from 'node:dns';
import net from 'node:net';

/**
 * Checks if an IPv4 address string falls into a private, loopback, or reserved range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IP treated as unsafe
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 10.0.0.0/8 (Private RFC 1918)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (Private RFC 1918)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (Private RFC 1918)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Cloud Metadata 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

  // 224.0.0.0/4 (Multicast)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future use)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address string falls into a private, loopback, or reserved range.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback (::1) and Unspecified (::)
  if (normalized === '::1' || normalized === '::') return true;

  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith('::ffff:')) {
    const v4Part = normalized.replace('::ffff:', '');
    if (net.isIPv4(v4Part)) {
      return isPrivateIPv4(v4Part);
    }
    return true;
  }

  // Link-local: fe80::/10
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  // Unique local addresses (ULA): fc00::/7 (fc00:: to fdff::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // Multicast: ff00::/8
  if (normalized.startsWith('ff')) {
    return true;
  }

  return false;
}

/**
 * Validates whether an IP address is private, loopback, cloud metadata, or reserved.
 */
export function isPrivateOrBlockedIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isPrivateIPv4(ip);
  }
  if (net.isIPv6(ip)) {
    return isPrivateIPv6(ip);
  }
  return true; // Unknown IP version is considered unsafe
}

/**
 * Validates a target URL against SSRF attacks.
 * Resolves all DNS records and ensures no target points to internal, private, or metadata networks.
 */
export async function validateUrlForSSRF(rawUrl: string): Promise<{ valid: boolean; error?: string; resolvedIp?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // 1. Only allow HTTP and HTTPS protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: `Disallowed protocol: ${parsed.protocol}. Only http: and https: are permitted.` };
  }

  // 2. Disallow embedded credentials (username:password@)
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs with embedded user credentials are not allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Reject known dangerous hostnames
  const blockedHostnames = ['localhost', 'metadata.google.internal', 'instance-data', '169.254.169.254'];
  if (blockedHostnames.includes(hostname)) {
    return { valid: false, error: `Host '${hostname}' is prohibited for SSRF security.` };
  }

  // 4. If hostname is directly an IP address
  if (net.isIP(hostname)) {
    if (isPrivateOrBlockedIP(hostname)) {
      return { valid: false, error: `Target IP ${hostname} is in a private, loopback, or reserved network range.` };
    }
    return { valid: true, resolvedIp: hostname };
  }

  // 5. Perform DNS resolution
  try {
    const lookupResults = await dns.promises.lookup(hostname, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      return { valid: false, error: `Could not resolve hostname: ${hostname}` };
    }

    for (const record of lookupResults) {
      if (isPrivateOrBlockedIP(record.address)) {
        return {
          valid: false,
          error: `DNS resolution for '${hostname}' returned forbidden IP ${record.address}.`,
          resolvedIp: record.address,
        };
      }
    }

    return { valid: true, resolvedIp: lookupResults[0].address };
  } catch (dnsErr: any) {
    return { valid: false, error: `DNS lookup failed for '${hostname}': ${dnsErr.message}` };
  }
}

/**
 * Performs a secure HTTP request, validating the URL and any redirect locations against SSRF.
 */
export async function safeFetch(
  rawUrl: string,
  init?: RequestInit,
  maxRedirects: number = 3
): Promise<Response> {
  let currentUrl = rawUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const validation = await validateUrlForSSRF(currentUrl);
    if (!validation.valid) {
      throw new Error(`SSRF Guard Blocked Request: ${validation.error}`);
    }

    const fetchInit: RequestInit = {
      ...init,
      redirect: 'manual', // Enforce manual redirect handling to re-validate destination
    };

    const response = await fetch(currentUrl, fetchInit);

    // If redirect status code
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      redirectsCount++;
      if (redirectsCount > maxRedirects) {
        throw new Error('Too many redirects');
      }

      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Redirect response missing Location header');
      }

      // Resolve relative redirects against current URL
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }

  throw new Error('Maximum redirect limit exceeded');
}
