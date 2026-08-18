import { describe, expect, it } from 'vitest';
import { extractSvixHeaders, verifySvixSignature, type SvixHeaders } from '../src/lib/webhookVerify';

const SECRET = 'whsec_' + btoa('test-secret-bytes-0123456789');

async function sign(id: string, timestamp: string, body: string, secret: string): Promise<string> {
  const secretBytes = Uint8Array.from(atob(secret.slice('whsec_'.length)), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signedContent = `${id}.${timestamp}.${body}`;
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent));
  const bytes = new Uint8Array(sigBuffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return `v1,${btoa(binary)}`;
}

describe('extractSvixHeaders', () => {
  it('extracts all three headers when present', () => {
    const req = new Request('https://example.com/webhook', {
      headers: { 'svix-id': 'msg_1', 'svix-timestamp': '1700000000', 'svix-signature': 'v1,abc' },
    });
    expect(extractSvixHeaders(req)).toEqual({ id: 'msg_1', timestamp: '1700000000', signature: 'v1,abc' });
  });

  it('returns null when any header is missing', () => {
    const req = new Request('https://example.com/webhook', { headers: { 'svix-id': 'msg_1' } });
    expect(extractSvixHeaders(req)).toBeNull();
  });
});

describe('verifySvixSignature', () => {
  const now = new Date('2026-08-18T10:00:00Z');
  const timestamp = String(Math.floor(now.getTime() / 1000));
  const body = JSON.stringify({ type: 'email.bounced', data: { email_id: 'abc123' } });

  it('accepts a correctly signed payload within the freshness window', async () => {
    const signature = await sign('msg_1', timestamp, body, SECRET);
    const headers: SvixHeaders = { id: 'msg_1', timestamp, signature };
    const result = await verifySvixSignature(headers, body, SECRET, now);
    expect(result.valid).toBe(true);
  });

  it('rejects a tampered body', async () => {
    const signature = await sign('msg_1', timestamp, body, SECRET);
    const headers: SvixHeaders = { id: 'msg_1', timestamp, signature };
    const tamperedBody = JSON.stringify({ type: 'email.delivered', data: { email_id: 'abc123' } });
    const result = await verifySvixSignature(headers, tamperedBody, SECRET, now);
    expect(result.valid).toBe(false);
  });

  it('rejects a signature made with the wrong secret', async () => {
    const wrongSecret = 'whsec_' + btoa('a-completely-different-secret');
    const signature = await sign('msg_1', timestamp, body, wrongSecret);
    const headers: SvixHeaders = { id: 'msg_1', timestamp, signature };
    const result = await verifySvixSignature(headers, body, SECRET, now);
    expect(result.valid).toBe(false);
  });

  it('rejects a stale timestamp (replay protection)', async () => {
    const staleTimestamp = String(Math.floor(now.getTime() / 1000) - 3600); // 1 óra régebbi
    const signature = await sign('msg_1', staleTimestamp, body, SECRET);
    const headers: SvixHeaders = { id: 'msg_1', timestamp: staleTimestamp, signature };
    const result = await verifySvixSignature(headers, body, SECRET, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('timestamp skew');
  });

  it('accepts the matching signature when multiple space-separated candidates are present (key rotation)', async () => {
    const correctSignature = await sign('msg_1', timestamp, body, SECRET);
    const decoySignature = 'v1,' + btoa('not-the-real-signature');
    const headers: SvixHeaders = { id: 'msg_1', timestamp, signature: `${decoySignature} ${correctSignature}` };
    const result = await verifySvixSignature(headers, body, SECRET, now);
    expect(result.valid).toBe(true);
  });

  it('rejects when the secret has no whsec_ prefix', async () => {
    const signature = await sign('msg_1', timestamp, body, SECRET);
    const headers: SvixHeaders = { id: 'msg_1', timestamp, signature };
    const result = await verifySvixSignature(headers, body, 'not-a-whsec-secret', now);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('whsec_');
  });
});
