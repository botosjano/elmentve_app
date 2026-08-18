// Twilio a Svix-től eltérő aláírás-sémát használ a státusz-webhookjain:
// HMAC-SHA1 a teljes URL-en + ábécésorrendbe rakott form-mezőkön, base64,
// az `X-Twilio-Signature` fejlécben. Külön modul, mert ez a Twilio saját
// sémája, nem a webhookVerify.ts-ben lévő Svix-forma -- ez a szétválasztás
// teszi lehetővé hogy egy jövőbeli, harmadik SMS-szolgáltató (más sémával)
// ne zavarja össze a meglévő kettőt.

export async function verifyTwilioSignature(
  fullUrl: string,
  formParams: Record<string, string>,
  signatureHeader: string | null,
  authToken: string,
): Promise<{ valid: boolean; reason?: string }> {
  if (!signatureHeader) return { valid: false, reason: 'missing X-Twilio-Signature header' };

  const sortedKeys = Object.keys(formParams).sort();
  let signedContent = fullUrl;
  for (const key of sortedKeys) {
    signedContent += key + formParams[key];
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent));
  const expected = base64Encode(new Uint8Array(signatureBuffer));

  if (!timingSafeEqual(signatureHeader, expected)) {
    return { valid: false, reason: 'signature mismatch' };
  }
  return { valid: true };
}

function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
