#!/usr/bin/env node
// SPF/DMARC DNS-rekord ellenőrző -- publikus DNS-lekérdezéssel fut, NEM
// igényel élő szolgáltató-fiókot vagy API-kulcsot. A DKIM-rekordot nem
// tudja általánosan ellenőrizni (a host neve szolgáltatónként eltérő,
// pl. Resend-nél "resend._domainkey.<domain>"), ahhoz add meg explicit
// a --dkim-host kapcsolóval, ha tudod.
//
// Használat:
//   node scripts/verify-dns.mjs ertesites.elmentve.hu
//   node scripts/verify-dns.mjs ertesites.elmentve.hu --dkim-host=resend._domainkey.ertesites.elmentve.hu
//
// Kilépési kód: 0 ha SPF+DMARC (és ha megadva, DKIM) rendben van, 1 egyébként.

import { resolveTxt } from 'node:dns/promises';

function parseArgs(argv) {
  const [domain, ...rest] = argv;
  if (!domain) {
    console.error('Használat: node scripts/verify-dns.mjs <aldomain> [--dkim-host=<host>]');
    process.exit(2);
  }
  let dkimHost = null;
  for (const arg of rest) {
    if (arg.startsWith('--dkim-host=')) dkimHost = arg.slice('--dkim-host='.length);
  }
  return { domain, dkimHost };
}

async function checkTxtRecord(host, predicate, label) {
  try {
    const records = await resolveTxt(host);
    const flat = records.map((parts) => parts.join(''));
    const match = flat.find(predicate);
    if (match) {
      console.log(`  OK   ${label}: ${match}`);
      return true;
    }
    console.log(`  HIÁNYZIK  ${label} -- talált TXT rekordok: ${flat.length ? flat.join(' | ') : '(nincs)'}`);
    return false;
  } catch (err) {
    console.log(`  HIBA  ${label}: ${err.code ?? err.message} (${host})`);
    return false;
  }
}

async function main() {
  const { domain, dkimHost } = parseArgs(process.argv.slice(2));
  console.log(`DNS-ellenőrzés: ${domain}\n`);

  const spfOk = await checkTxtRecord(domain, (v) => v.startsWith('v=spf1'), 'SPF');
  const dmarcOk = await checkTxtRecord(`_dmarc.${domain}`, (v) => v.startsWith('v=DMARC1'), 'DMARC');

  let dkimOk = true;
  if (dkimHost) {
    dkimOk = await checkTxtRecord(dkimHost, () => true, 'DKIM');
  } else {
    console.log('  KIHAGYVA  DKIM -- add meg --dkim-host=<a szolgáltató által adott host>-tal, hogy ezt is ellenőrizzem.');
  }

  console.log('');
  if (spfOk && dmarcOk && dkimOk) {
    console.log('Minden ellenőrzött rekord rendben.');
    process.exit(0);
  } else {
    console.log('Legalább egy rekord hiányzik vagy hibás -- l. worker/docs/email-deliverability-runbook.md.');
    process.exit(1);
  }
}

main();
