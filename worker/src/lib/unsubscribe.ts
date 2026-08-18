// Állapotmentes, HMAC-aláírt leiratkozó token: nem igényel bejelentkezést
// (a spec 11. része szerint az emailben "világos leiratkozási lehetőség"
// kell), és nem igényel külön adatbázis-táblát a token tárolására -- a
// token maga hordozza az adatot (user_id, csatorna, cím, lejárat), az
// aláírás garantálja hogy nem hamisítható.
//
// Formátum: base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload, secret))

export interface UnsubscribePayload {
  userId: string;
  channel: 'email' | 'sms';
  address: string;
  /** Unix epoch másodperc, ameddig a link érvényes. */
  expiresAt: number;
}

const DEFAULT_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 nap -- egy email sokáig ülhet a postaládában

export async function createUnsubscribeToken(
  payload: Omit<UnsubscribePayload, 'expiresAt'>,
  secret: string,
  now: Date = new Date(),
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const full: UnsubscribePayload = {
    ...payload,
    expiresAt: Math.floor(now.getTime() / 1000) + ttlSeconds,
  };
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(full)));
  const signature = await hmacSha256Base64Url(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifyUnsubscribeToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): Promise<{ valid: true; payload: UnsubscribePayload } | { valid: false; reason: string }> {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'malformed token' };
  const [encodedPayload, signature] = parts;

  const expectedSignature = await hmacSha256Base64Url(secret, encodedPayload);
  if (!timingSafeEqual(signature, expectedSignature)) {
    return { valid: false, reason: 'signature mismatch' };
  }

  let payload: UnsubscribePayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));
  } catch {
    return { valid: false, reason: 'invalid payload json' };
  }

  if (typeof payload.expiresAt !== 'number' || Math.floor(now.getTime() / 1000) > payload.expiresAt) {
    return { valid: false, reason: 'token expired' };
  }
  if (
    typeof payload.userId !== 'string' ||
    (payload.channel !== 'email' && payload.channel !== 'sms') ||
    typeof payload.address !== 'string'
  ) {
    return { valid: false, reason: 'invalid payload shape' };
  }

  return { valid: true, payload };
}

async function hmacSha256Base64Url(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return base64UrlEncode(new Uint8Array(signatureBuffer));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
