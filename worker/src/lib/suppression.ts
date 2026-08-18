import type { SupabaseClient } from '@supabase/supabase-js';

export type Channel = 'email' | 'sms';
export type SuppressionReason = 'bounced' | 'complained' | 'unsubscribed' | 'manual';
export type SuppressionSource = 'webhook' | 'unsubscribe_link' | 'admin';

/** Egységes normalizálás, hogy "Foo@Bar.com " és "foo@bar.com" ugyanaz a
 *  suppression-sor legyen (a `suppressions_channel_address_unique` erre a
 *  normalizált alakra épít). SMS-nél feltételezzük hogy a hívó már E.164
 *  formátumban adja át (a Twilio-adapter is így küld) -- itt csak trim. */
export function normalizeAddress(channel: Channel, address: string): string {
  const trimmed = address.trim();
  return channel === 'email' ? trimmed.toLowerCase() : trimmed;
}

export async function isSuppressed(
  supabase: SupabaseClient,
  channel: Channel,
  address: string,
): Promise<boolean> {
  const normalized = normalizeAddress(channel, address);
  const { data, error } = await supabase.rpc('is_suppressed', {
    p_channel: channel,
    p_address: normalized,
  });
  if (error) {
    // Fail-closed lenne a "biztonságosabb" válasz, DE itt a suppression-
    // ellenőrzés hibája nem szabad hogy megakassza a teljes küldést -- egy
    // átmeneti DB-hiba miatt ne veszítsünk el legitim emlékeztetőket. A
    // hívó kód emiatt logolja a hibát, de küld tovább.
    throw new Error(`is_suppressed rpc failed: ${error.message}`);
  }
  return Boolean(data);
}

export async function addSuppression(
  supabase: SupabaseClient,
  channel: Channel,
  address: string,
  reason: SuppressionReason,
  source: SuppressionSource,
  detail?: string,
): Promise<void> {
  const normalized = normalizeAddress(channel, address);
  const { error } = await supabase
    .from('suppressions')
    .upsert(
      { channel, address: normalized, reason, source, detail: detail ?? null },
      { onConflict: 'channel,address', ignoreDuplicates: false },
    );
  if (error) {
    throw new Error(`addSuppression failed: ${error.message}`);
  }

  // Ismert korlát: a profiles.notification_email/phone mezőt az app írja,
  // nem garantált hogy már normalizált alakban van tárolva -- ha egy
  // felhasználó email-címe eltérő kis/nagybetűvel szerepel a profilban mint
  // ahogy a webhook visszaadja, ez az egyeztetés lemaradhat róla (a
  // suppressions tábla sora viszont mindenképp helyesen létrejön, csak a
  // profil "unreachable" jelzése maradhat el). Végleges javítás: normalizált
  // generált oszlop + index a profiles táblán, külön kártya.
  const statusColumn = channel === 'email' ? 'email_channel_status' : 'sms_channel_status';
  const addressColumn = channel === 'email' ? 'notification_email' : 'phone';
  await supabase
    .from('profiles')
    .update({ [statusColumn]: 'unreachable', updated_at: new Date().toISOString() })
    // ilyenkor NEM ismerjük a user_id-t közvetlenül, csak a címet -- a
    // profiles tábla saját maga tárolja a jelenlegi cím/telefon mezőt,
    // ez alapján találjuk meg a hozzá tartozó profilt (ha van). Az egyenlő
    // összehasonlítás elé normalizálva kerül a bejövő cím is.
    .eq(addressColumn, normalized);
}
