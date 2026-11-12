#!/usr/bin/env node
// Reazix Billing - product key maker. FOR REAZIX ONLY: run it on the company
// PC that holds license-tool/private-key.pem. Never send this folder's .pem to
// anyone, and keep a copy of it offline (pendrive): without it no new key
// can be made that the installed apps accept.
//
// Make a lifetime key, entered once, for ONE PC (the shop's first counter;
// the owner fills in the shop details in the app):
//   node license-tool/reazix-license.mjs --shop "Shree Ganesh Traders" --pc 7KQ2-M9XA-44TP
// A key that ends (trial, say), only if ever wanted:  --until 2027-12-31
//
// Shop details in the key (fills the invoice header and LOCKS it, so the key
// cannot be used for another shop): --gstin, and optionally --address --city
// --state --pin. For a shop's 2nd, 3rd... counter: ask the owner for the
// details exactly as on counter 1 (Settings -> Company Details), add
// --counter 2; that PC's invoices are numbered C2/... so they never clash.
//   node license-tool/reazix-license.mjs --shop "Shree Ganesh Traders" --gstin 27AAPFU0939F1ZV
//        --address "Main Road" --city Pune --state Maharashtra --pin 411001 --pc 7KQ2-M9XA-44TP
//   ...same details... --counter 2 --pc 1ABC-2DEF-3GHJ
// Read a key back: node license-tool/reazix-license.mjs --check <key>
//
// Every key made is added to license-tool/issued-keys.csv (also kept private).

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIVATE_KEY_PATH = path.join(HERE, 'private-key.pem');
const LOG_PATH = path.join(HERE, 'issued-keys.csv');
// One key, one PC: every counter gets its own key.
const MAX_PCS = 1;

const normPc = (c) => String(c || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
const fmtPc = (c) => normPc(c).match(/.{1,4}/g)?.join('-') || '';
const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function hasPrivateKey() {
  return fs.existsSync(PRIVATE_KEY_PATH);
}

/** Make a signed key. pcs: 1 or 2 PC Codes. until: optional last valid day YYYY-MM-DD (none = lifetime). */
export function issueKey({ shop, pcs, until = null, gstin = null, address = {}, counter = null }) {
  if (!hasPrivateKey()) throw new Error(`No private key at ${PRIVATE_KEY_PATH}. Keys can only be made on the Reazix PC.`);
  const list = [...new Set(pcs.map(fmtPc).filter(Boolean))];
  if (list.length < 1 || list.length > MAX_PCS) throw new Error(`One key is for ONE PC: give exactly one --pc (got ${list.length}). Make a separate key for each counter.`);
  for (const c of list) if (normPc(c).length !== 12) throw new Error(`"${c}" is not a PC Code (it has 12 letters/digits, like 7KQ2-M9XA-44TP).`);
  if (until !== null && !/^\d{4}-\d{2}-\d{2}$/.test(until)) throw new Error('until must be YYYY-MM-DD');
  const payload = { id: crypto.randomBytes(4).toString('hex').toUpperCase(), n: String(shop || '').trim(), p: list, i: localDay(new Date()) };
  if (until) payload.e = until;
  if (gstin) {
    const g = String(gstin).toUpperCase().replace(/\s+/g, '');
    if (!/^\d{2}[A-Z0-9]{13}$/.test(g)) throw new Error(`"${gstin}" is not a GSTIN (15 characters, like 27AAPFU0939F1ZV).`);
    payload.g = g;
  }
  const b = Object.fromEntries(Object.entries(address || {}).filter(([, v]) => v).map(([k, v]) => [k, String(v).trim()]));
  if (Object.keys(b).length) payload.b = b;
  if (counter !== null && counter !== undefined) {
    const c = Number(counter);
    if (!Number.isInteger(c) || c < 1 || c > 99) throw new Error('--counter must be a number from 1 to 99.');
    if (list.length !== 1) throw new Error('A counter key is for ONE PC: give one --pc with --counter.');
    if (!payload.g && !payload.b) throw new Error('A counter key needs the shop details too: add --gstin (and the address).');
    payload.c = c;
  }
  const body = Buffer.from(JSON.stringify(payload));
  const sig = crypto.sign(null, Buffer.concat([Buffer.from('RZX1.'), body]), crypto.createPrivateKey(fs.readFileSync(PRIVATE_KEY_PATH)));
  return { key: `RZX1.${body.toString('base64url')}.${sig.toString('base64url')}`, payload };
}

export function readKey(key) {
  const parts = String(key || '').replace(/\s+/g, '').split('.');
  if (parts.length !== 3 || parts[0] !== 'RZX1') return null;
  try { return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch { return null; }
}

/** For the tests: give a running app (url) a key for its own PC. */
export async function activateForTest(url) {
  const st = await (await fetch(`${url}/api/license`)).json();
  if (st.state === 'active') return st;
  const { key } = issueKey({ shop: 'Smoke Test', pcs: [st.pc] });
  const res = await (await fetch(`${url}/api/license/activate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) })).json();
  if (!res.ok) throw new Error(`Test activation failed: ${res.error}`);
  return res;
}

// ---- command line ----
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const all = (name) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []));
  const one = (name) => all(name)[0];
  try {
    if (one('check')) {
      const p = readKey(one('check'));
      if (!p) throw new Error('Not a Reazix product key.');
      console.log(`\n  Shop:     ${p.n}\n  GSTIN:    ${p.g || '-'}\n  Address:  ${p.b ? Object.values(p.b).join(', ') : '-'}\n  Counter:  ${p.c || '-'}\n  PC Codes: ${p.p.join(', ')}\n  Valid to: ${p.e || 'lifetime'}\n  Issued:   ${p.i}\n  Key ID:   ${p.id}\n`);
      process.exit(0);
    }
    const shop = one('shop');
    const pcs = all('pc');
    if (!shop || !pcs.length) {
      console.log('\n  Usage: node license-tool/reazix-license.mjs --shop "Shop name" --pc XXXX-XXXX-XXXX [--pc XXXX-XXXX-XXXX]\n');
      process.exit(1);
    }
    const { key, payload } = issueKey({
      shop, pcs, until: one('until') || null, gstin: one('gstin') || null, counter: one('counter') ?? null,
      address: { address: one('address'), city: one('city'), state: one('state'), pin: one('pin') },
    });
    const validTo = payload.e || 'lifetime';
    const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, 'issued,keyId,shop,gstin,counter,pcCodes,validTo,key\n');
    else if (!fs.readFileSync(LOG_PATH, 'utf8').startsWith('issued,keyId,shop,gstin')) {
      // Older log without the gstin/counter columns: start a new one beside it.
      fs.renameSync(LOG_PATH, LOG_PATH.replace(/\.csv$/, `-old-${Date.now()}.csv`));
      fs.writeFileSync(LOG_PATH, 'issued,keyId,shop,gstin,counter,pcCodes,validTo,key\n');
    }
    fs.appendFileSync(LOG_PATH, `${payload.i},${payload.id},${csv(payload.n)},${payload.g || ''},${payload.c || ''},${payload.p.join(' ')},${validTo},${key}\n`);
    console.log(`\n  Product key for ${payload.n}${payload.c ? ` - counter ${payload.c} (invoices C${payload.c}/...)` : ''}`);
    console.log(`  GSTIN: ${payload.g || '-'}   PC Codes: ${payload.p.join(', ')}   Valid: ${validTo}   Key ID: ${payload.id}\n`);
    console.log(key);
    console.log('\n  Send the line above to the shop owner (WhatsApp / email). Saved in license-tool/issued-keys.csv.\n');
  } catch (err) {
    console.error(`\n  x ${err.message}\n`);
    process.exit(1);
  }
}
