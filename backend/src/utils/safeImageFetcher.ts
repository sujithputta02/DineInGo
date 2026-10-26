import dns from 'dns';
import net from 'net';
import { URL } from 'url';

export interface SafeImageResult {
  buffer: Buffer;
  contentType: string;
  byteSize: number;
}

export interface SafeDownloadOptions {
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  allowedMimeTypes?: string[];
}

const DEFAULT_MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Checks whether an IPv4 address belongs to a private, loopback, link-local,
 * or cloud metadata IP range.
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IP is unsafe
  }

  const [b0, b1, b2, b3] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 10.0.0.0/8 (RFC1918 Private)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (RFC1918 Private: 172.16.0.0 - 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (RFC1918 Private)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Cloud Metadata: 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 100.64.0.0/10 (Carrier Grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b0 === 192 && b1 === 0 && b2 === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (b0 === 192 && b1 === 0 && b2 === 2) return true;

  // 198.18.0.0/15 (Network Benchmark)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (b0 === 198 && b1 === 51 && b2 === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (b0 === 203 && b1 === 0 && b2 === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 & 255.255.255.255 (Reserved & Broadcast)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Checks whether an IPv6 address belongs to loopback, link-local, or private ranges.
 */
export function isPrivateOrReservedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // Loopback (::1)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

  // Unspecified (::)
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // Unique local addresses (fc00::/7 -> fc00... or fd00...)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Link-local (fe80::/10)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || 
      normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.substring(7);
    if (net.isIPv4(ipv4Part)) {
      return isPrivateOrReservedIPv4(ipv4Part);
    }
  }

  return false;
}

/**
 * Validates a destination URL to prevent SSRF and unsafe protocols.
 */
export async function validateDestinationUrl(urlString: string): Promise<{ valid: boolean; reason?: string; parsedUrl?: URL }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    return { valid: false, reason: 'Malformed URL format.' };
  }

  // 1. Strict Protocol check
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      valid: false,
      reason: `Disallowed protocol "${parsedUrl.protocol}". Only HTTP and HTTPS are permitted.`
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase().trim();

  // 2. Reject obvious localhost aliases
  if (
    hostname === 'localhost' ||
    hostname === 'localhost.localdomain' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    return { valid: false, reason: 'Localhost and internal host destinations are strictly forbidden.' };
  }

  // 3. If hostname is directly an IP address
  if (net.isIPv4(hostname)) {
    if (isPrivateOrReservedIPv4(hostname)) {
      return { valid: false, reason: `Private IPv4 destination (${hostname}) is forbidden (SSRF protection).` };
    }
    return { valid: true, parsedUrl };
  }

  if (net.isIPv6(hostname.replace(/^\[|\]$/g, ''))) {
    const rawIpv6 = hostname.replace(/^\[|\]$/g, '');
    if (isPrivateOrReservedIPv6(rawIpv6)) {
      return { valid: false, reason: `Private IPv6 destination (${rawIpv6}) is forbidden (SSRF protection).` };
    }
    return { valid: true, parsedUrl };
  }

  // 4. DNS Resolution: verify that all resolved IPs are public
  try {
    const records = await dns.promises.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      return { valid: false, reason: `DNS resolution returned no addresses for host "${hostname}".` };
    }

    for (const record of records) {
      if (record.family === 4) {
        if (isPrivateOrReservedIPv4(record.address)) {
          return {
            valid: false,
            reason: `Host "${hostname}" resolved to forbidden private IPv4 address (${record.address}).`
          };
        }
      } else if (record.family === 6) {
        if (isPrivateOrReservedIPv6(record.address)) {
          return {
            valid: false,
            reason: `Host "${hostname}" resolved to forbidden private IPv6 address (${record.address}).`
          };
        }
      }
    }
  } catch (dnsErr: any) {
    return { valid: false, reason: `DNS lookup failed for "${hostname}": ${dnsErr.message}` };
  }

  return { valid: true, parsedUrl };
}

/**
 * Validates binary image buffer magic bytes against supported image signatures.
 */
export function verifyImageMagicBytes(buffer: Buffer): { valid: boolean; detectedMime?: string } {
  if (buffer.length < 12) {
    return { valid: false };
  }

  // JPEG magic: 0xFF, 0xD8, 0xFF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // PNG magic: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47
  ) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // WebP magic: 'RIFF' at 0..3 and 'WEBP' at 8..11
  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return { valid: true, detectedMime: 'image/webp' };
  }

  return { valid: false };
}

/**
 * Safely fetches an image from a URL with full SSRF protection, size limits,
 * timeouts, safe redirect inspection, and content validation.
 */
export async function safeFetchImage(
  urlString: string,
  options: SafeDownloadOptions = {}
): Promise<SafeImageResult> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const allowedMimes = options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIMES;

  let currentUrl = urlString;
  let redirectsRemaining = maxRedirects;

  while (true) {
    // 1. SSRF and destination check
    const validation = await validateDestinationUrl(currentUrl);
    if (!validation.valid || !validation.parsedUrl) {
      throw new Error(`SSRF Protection: Blocked destination "${currentUrl}". Reason: ${validation.reason}`);
    }

    // 2. Fetch with manual redirect and timeout signal
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'Accept': 'image/jpeg,image/png,image/webp,*/*;q=0.8',
          'User-Agent': 'DineInGo-FoodIntelligence/1.0'
        }
      });
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`Image download timed out after ${timeoutMs}ms.`);
      }
      throw new Error(`Failed to request image: ${err.message}`);
    } finally {
      clearTimeout(timer);
    }

    // 3. Handle redirects safely
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectsRemaining <= 0) {
        throw new Error(`Too many redirects (exceeded limit of ${maxRedirects}).`);
      }
      redirectsRemaining--;

      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect response (${response.status}) missing Location header.`);
      }

      // Resolve relative redirects safely
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`Image download failed with HTTP status ${response.status} (${response.statusText}).`);
    }

    // 4. Content-Type check
    const contentTypeHeader = (response.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
    if (!allowedMimes.includes(contentTypeHeader)) {
      throw new Error(`Unsupported content type "${contentTypeHeader}". Expected one of: ${allowedMimes.join(', ')}.`);
    }

    // 5. Content-Length header check
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const declaredBytes = Number(contentLength);
      if (!isNaN(declaredBytes) && declaredBytes > maxBytes) {
        throw new Error(`Image size (${declaredBytes} bytes) exceeds maximum limit of ${maxBytes} bytes.`);
      }
    }

    // 6. Streaming chunk size guard
    if (!response.body) {
      throw new Error('Image response body is empty.');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          receivedBytes += value.length;
          if (receivedBytes > maxBytes) {
            reader.cancel();
            throw new Error(`Image payload exceeded maximum limit of ${maxBytes} bytes during transfer.`);
          }
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }

    const buffer = Buffer.concat(chunks);

    // 7. Magic bytes verification
    const magicCheck = verifyImageMagicBytes(buffer);
    if (!magicCheck.valid) {
      throw new Error('Image verification failed: File content does not match expected JPEG, PNG, or WebP headers.');
    }

    return {
      buffer,
      contentType: magicCheck.detectedMime || contentTypeHeader,
      byteSize: buffer.length
    };
  }
}

/**
 * Decodes and validates an inline data URL (e.g. data:image/jpeg;base64,...)
 * without performing any network operations.
 */
export function parseAndValidateDataUrl(
  dataUrl: string,
  maxBytes = DEFAULT_MAX_BYTES
): SafeImageResult {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URL format. Expected "data:<mime>;base64,<payload>".');
  }

  const mime = match[1].toLowerCase().trim();
  if (!DEFAULT_ALLOWED_MIMES.includes(mime)) {
    throw new Error(`Unsupported data URL MIME type "${mime}". Expected JPEG, PNG, or WebP.`);
  }

  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > maxBytes) {
    throw new Error(`Base64 image size (${buffer.length} bytes) exceeds maximum limit of ${maxBytes} bytes.`);
  }

  const magic = verifyImageMagicBytes(buffer);
  if (!magic.valid) {
    throw new Error('Base64 image payload does not contain valid image magic bytes.');
  }

  return {
    buffer,
    contentType: magic.detectedMime || mime,
    byteSize: buffer.length
  };
}
