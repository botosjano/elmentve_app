// Svix-stílusú webhook-aláírás-ellenőrzés Web Crypto API-val.
//
// A Resend (és sok más szolgáltató, pl. Clerk, Svix maga) a Svix-formátumot
// használja: `svix-id`, `svix-timestamp`, `svix-signature` fejlécek, az
// aláírt tartalom `${id}.${timestamp}.${nyers body}`, a titok
// `whsec_`-prefixű base64. Ez a modul PROVIDER-FÜGGETLEN abban az
// értelemben, hogy bármelyik Svix-alapú webhook-forrás ellenőrzésére
// használható -- ha egy jövőbeli szolgáltató más sémát használ (pl. AWS SNS
// saját aláírás), azt külön modulként kell hozzáadni, ez a fájl nem
// Resend-specifikus.
//
// Nem használunk npm `svix` csomagot: a Cloudflare Workers-kompatibilitása
// bizonytalan (Node-specifikus API-kra épülhet), a HMAC-SHA256 viszont
// triviálisan implementálható a Worker-natív Web Crypto SubtleCrypto-val,
// külső függőség nélkül.

export interface SvixHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60;

export function extractSvixHeaders(request: Request): SvixHeaders | null {
  const id = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');
  if (!id || !timestamp || !signature) return null;
  return { id, timestamp, signature };
}

/**
 * @param secret A `whsec_...` formátumú titok (base64 rész a prefix után).
 * @param rawBody A KÉRÉS NYERS (nem újra-szerializált) törzse -- az aláírás
 *   a byte-pontos tartalomra vonatkozik, egy JSON.parse+stringify kör
 *   ELRONTANÁ az ellenőrzést, ha a whitespace/kulcs-sorrend eltér.
 */
export async function verifySvixSignature(
  headers: SvixHeaders,
  rawBody: string,
  secret: string,
  now: Date = new Date(),
): Promise<{ valid: boolean; reason?: string }> {
  const timestampSeconds = Number(headers.timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return { valid: false, reason: 'invalid timestamp' };
  }
  const skew = Math.abs(now.getTime() / 1000 - timestampSeconds);
  if (skew > MAX_TIMESTAMP_SKEW_SECONDS) {
    // Replay-védelem: egy régi, elcsípett payload újraküldése ne menjen át.
    return { valid: false, reason: `timestamp skew too large: ${skew}s` };
  }

  if (!secret.startsWith('whsec_')) {
    return { valid: false, reason: 'secret missing whsec_ prefix' };
  }
  const secretBytes = base64Decode(secret.slice('whsec_'.length));

  const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
  const expectedSignature = await hmacSha256Base64(secretBytes, signedContent);

  // A svix-signature fejléc "v1,<base64> v1,<base64> ..." formátumú lehet
  // (kulcs-rotáció alatt több aláírás is szerepelhet) -- ha BÁRMELYIK
  // egyezik, elfogadjuk.
  const candidates = headers.signature
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.startsWith('v1,') ? part.slice('v1,'.length) : part));

  const matches = candidates.some((candidate) => timingSafeEqual(candidate, expectedSignature));
  if (!matches) {
    return { valid: false, reason: 'signature mismatch' };
  }
  return { valid: true };
}

async function hmacSha256Base64(keyBytes: Uint8Array, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return base64Encode(new Uint8Array(signatureBuffer));
}

function base64Decode(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Konstans idejű összehasonlítás -- ne adjunk timing-oracle-t a támadónak. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
