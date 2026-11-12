// Checks that a downloaded update ZIP was made by Reazix, before anything is
// changed. Run by update-windows.ps1 and update-unix.sh from the INSTALLED
// copy of the app, so a hacked download cannot replace this check.
//
//   node verify-update.cjs <zip> <tag> <signature>
//
// The release is signed (scripts/publish-site.mjs) with Reazix's private key
// over "RZXUPD1|<tag>|<sha256 of the ZIP>". Only the public key is here, so a
// ZIP put on the website by anyone else fails. Exit 0 = genuine.
'use strict';
const crypto = require('crypto');
const fs = require('fs');

const PUBLIC_KEY = crypto.createPublicKey({
  key: Buffer.from('MCowBQYDK2VwAyEAQ/0B14EAPizBXnANQgnmkpR6c5oljRKXAqsCVLiHMlg=', 'base64'),
  format: 'der', type: 'spki',
});

const [zip, tag, signature] = process.argv.slice(2);
function stop(msg) {
  console.error(`  ${msg}`);
  process.exit(1);
}
if (!zip || !tag || !signature) stop('The update has no Reazix signature, so it was not installed. Nothing was changed.');

let sha;
try {
  sha = crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
} catch (e) {
  stop(`Could not read the downloaded update: ${e.message}`);
}
let ok = false;
try {
  ok = crypto.verify(null, Buffer.from(`RZXUPD1|${tag}|${sha}`), PUBLIC_KEY, Buffer.from(signature, 'base64'));
} catch { ok = false; }
if (!ok) stop('The update is not signed by Reazix (it may have been changed on the way). It was not installed. Nothing was changed.');
console.log('  Update signature checked: made by Reazix.');
