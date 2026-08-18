import { describe, expect, it } from 'vitest';
import { verifyTwilioSignature } from '../src/lib/twilioWebhookVerify';

const AUTH_TOKEN = 'test-twilio-auth-token';
const URL = 'https://worker.elmentve.hu/webhooks/twilio';

async function sign(url: string, params: Record<string, string>, authToken: string): Promise<string> {
  const sortedKeys = Object.keys(params).sort();
  let signedContent = url;
  for (const key of sortedKeys) signedContent += key + params[key];
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(authToken), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent));
  const bytes = new Uint8Array(sigBuffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

describe('verifyTwilioSignature', () => {
  const params = { MessageSid: 'SM123', MessageStatus: 'delivered', To: '+36301234567' };

  it('accepts a correctly signed request', async () => {
    const signature = await sign(URL, params, AUTH_TOKEN);
    const result = await verifyTwilioSignature(URL, params, signature, AUTH_TOKEN);
    expect(result.valid).toBe(true);
  });

  it('rejects when a param value is tampered with', async () => {
    const signature = await sign(URL, params, AUTH_TOKEN);
    const tamperedParams = { ...params, MessageStatus: 'failed' };
    const result = await verifyTwilioSignature(URL, tamperedParams, signature, AUTH_TOKEN);
    expect(result.valid).toBe(false);
  });

  it('rejects when the URL differs from the one that was signed', async () => {
    const signature = await sign(URL, params, AUTH_TOKEN);
    const result = await verifyTwilioSignature('https://worker.elmentve.hu/webhooks/twilio-decoy', params, signature, AUTH_TOKEN);
    expect(result.valid).toBe(false);
  });

  it('rejects when the auth token used to verify differs from the one used to sign', async () => {
    const signature = await sign(URL, params, AUTH_TOKEN);
    const result = await verifyTwilioSignature(URL, params, signature, 'wrong-token');
    expect(result.valid).toBe(false);
  });

  it('rejects a missing signature header', async () => {
    const result = await verifyTwilioSignature(URL, params, null, AUTH_TOKEN);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('missing');
  });

  it('is order-independent for the params object (sorts before signing)', async () => {
    const signature = await sign(URL, params, AUTH_TOKEN);
    const reordered = { To: params.To, MessageSid: params.MessageSid, MessageStatus: params.MessageStatus };
    const result = await verifyTwilioSignature(URL, reordered, signature, AUTH_TOKEN);
    expect(result.valid).toBe(true);
  });
});
