/**
 * DineInGo QR Payload Validation & Navigation Service
 * ───────────────────────────────────────────────────
 * Validates scanned QR payloads against open-redirect vulnerabilities,
 * extracts dish and restaurant navigation targets, and enforces domain safety.
 */

export interface ParsedQRPayload {
  isValid: boolean;
  targetUrl?: string;
  targetRoute?: string;
  dishId?: string;
  dishName?: string;
  restaurantId?: string;
  tableId?: string;
  error?: string;
}

export const ALLOWED_QR_DOMAINS = [
  'dineingo.com',
  'localhost',
  '127.0.0.1',
  'vercel.app',
  'onrender.com'
];

/**
 * Validates and extracts safe destination from QR payload
 */
export function parseAndValidateQRPayload(rawPayload: string): ParsedQRPayload {
  if (!rawPayload || typeof rawPayload !== 'string') {
    return { isValid: false, error: 'Empty or invalid QR payload' };
  }

  const trimmed = rawPayload.trim();

  // 1. JSON Payload Format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(trimmed);
      if (data.type === 'ar-dish' || data.dish || data.dishId) {
        const dish = data.dish || data.dishId;
        return {
          isValid: true,
          dishId: dish,
          restaurantId: data.restaurantId,
          tableId: data.tableId,
          targetRoute: `/ar-demo?dish=${encodeURIComponent(dish)}`
        };
      }
      if (data.restaurantId) {
        return {
          isValid: true,
          restaurantId: data.restaurantId,
          tableId: data.tableId,
          targetRoute: `/restaurant/${encodeURIComponent(data.restaurantId)}`
        };
      }
      return { isValid: false, error: 'Unsupported DineInGo QR data structure' };
    } catch {
      return { isValid: false, error: 'Malformed JSON QR payload' };
    }
  }

  // 2. Custom Scheme: dineingo://
  if (trimmed.startsWith('dineingo://')) {
    try {
      const url = new URL(trimmed.replace('dineingo://', 'https://dineingo.local/'));
      const dish = url.searchParams.get('dish');
      const restaurantId = url.searchParams.get('restaurantId') || url.pathname.split('/')[2];
      
      if (dish) {
        return {
          isValid: true,
          dishId: dish,
          targetRoute: `/ar-demo?dish=${encodeURIComponent(dish)}`
        };
      }
      if (restaurantId) {
        return {
          isValid: true,
          restaurantId,
          targetRoute: `/restaurant/${encodeURIComponent(restaurantId)}`
        };
      }
      return { isValid: false, error: 'Invalid DineInGo deep link format' };
    } catch {
      return { isValid: false, error: 'Malformed deep link payload' };
    }
  }

  // 3. Relative URL Format (e.g. /ar-demo?dish=salad-bowl)
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.includes('\\')) {
      return { isValid: false, error: 'Invalid relative path or protocol-relative URL' };
    }
    const cleanUrl = new URL(trimmed, 'https://dineingo.local');
    const dish = cleanUrl.searchParams.get('dish');
    return {
      isValid: true,
      dishId: dish || undefined,
      targetRoute: trimmed
    };
  }

  // 4. Standard HTTPS / HTTP URLs
  try {
    const parsed = new URL(trimmed);

    // Reject dangerous schemes
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { isValid: false, error: `Disallowed URL protocol: ${parsed.protocol}` };
    }

    // Hostname safety check (Open Redirect Prevention)
    const hostname = parsed.hostname.toLowerCase();
    const isDomainPermitted = ALLOWED_QR_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isDomainPermitted) {
      return {
        isValid: false,
        error: `Untrusted QR destination domain "${hostname}". DineInGo only opens verified dining domains.`
      };
    }

    const dish = parsed.searchParams.get('dish');
    const restaurantMatch = parsed.pathname.match(/\/restaurant\/([^/?#]+)/);
    const restaurantId = restaurantMatch ? restaurantMatch[1] : parsed.searchParams.get('restaurantId');
    const tableId = parsed.searchParams.get('tableId');

    const relativeRoute = parsed.pathname + parsed.search;

    return {
      isValid: true,
      targetUrl: trimmed,
      targetRoute: relativeRoute,
      dishId: dish || undefined,
      restaurantId: restaurantId || undefined,
      tableId: tableId || undefined
    };
  } catch {
    return { isValid: false, error: 'Unrecognized QR code text or URL' };
  }
}
