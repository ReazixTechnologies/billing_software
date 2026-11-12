// Builds the billing.reazix.com website folder: the help pages every ? button
// in the app opens, the update file the app checks, the installers and the
// download. Upload the folder's contents to the web server as they are.
//
// Run: npm run site                       (writes ../billing.reazix)
//      npm run site -- --out=/some/folder
//      npm run site -- --zip=/path/to/Reazix-Billing-v1.0.0.zip

import { execFileSync } from 'child_process';
import { createHash, createPrivateKey, sign } from 'crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const OUT = resolve(ROOT, arg('out') || '../billing.reazix');
const SITE = 'https://billing.reazix.com';
const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

console.log(`\nPublishing billing.reazix.com (v${version}) to ${OUT}\n`);
mkdirSync(OUT, { recursive: true });

// 1. Help pages, built fresh, at /help/.
execFileSync(process.execPath, [join(ROOT, 'docs-site', 'build.mjs')], { cwd: ROOT, stdio: 'ignore' });
rmSync(join(OUT, 'help'), { recursive: true, force: true });
cpSync(join(ROOT, 'docs-site', 'out', 'help'), join(OUT, 'help'), { recursive: true });
console.log('  ✓ help/                 the answers behind every ? button');

// 2. One-line installers.
for (const f of ['install.ps1', 'install.sh']) copyFileSync(join(ROOT, f), join(OUT, f));
console.log('  ✓ install.ps1, install.sh');

// 3. The download. Without a ZIP the folder still works; the download waits.
const zip = arg('zip') ? resolve(arg('zip')) : join(ROOT, 'release-build', `Reazix-Billing-v${version}.zip`);
mkdirSync(join(OUT, 'download'), { recursive: true });
if (existsSync(zip)) {
  copyFileSync(zip, join(OUT, 'download', 'Reazix-Billing.zip'));
  copyFileSync(zip, join(OUT, 'download', `Reazix-Billing-v${version}.zip`));
  console.log(`  ✓ download/Reazix-Billing.zip (v${version})`);
} else {
  console.log(`  ! download/ has no ZIP: run npm run release:zip, or pass --zip=<file>`);
}

// 4. The update file. Same fields as a GitHub release, which is what the app
// and its update scripts read (server.js /api/check-update, update-*.sh/.ps1).
const changelog = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8').replace(/\r\n/g, '\n');
const top = /^## \[([^\]]+)\] - (\S+)\n([\s\S]*?)(?=\n---\n|\n## \[|(?![\s\S]))/m.exec(changelog);
if (!top || top[1] !== version) {
  console.error(`  x CHANGELOG.md must start with "## [${version}] - YYYY-MM-DD"`);
  process.exit(1);
}
// The ZIP is signed with Reazix's private key (license-tool/, never on the
// website). The app's updater checks it with verify-update.cjs, so a ZIP
// swapped on a hacked website is refused by every shop.
if (!existsSync(zip)) {
  console.error('  x No release ZIP to sign: run npm run release:zip first.');
  process.exit(1);
}
const PRIVATE_KEY_PATH = join(ROOT, 'license-tool', 'private-key.pem');
if (!existsSync(PRIVATE_KEY_PATH)) {
  console.error('  x license-tool/private-key.pem is missing: copy it from the backup pen drive. Updates cannot be published unsigned.');
  process.exit(1);
}
const zipBytes = readFileSync(zip);
const zipSha = createHash('sha256').update(zipBytes).digest('hex');
const signature = sign(null, Buffer.from(`RZXUPD1|v${version}|${zipSha}`), createPrivateKey(readFileSync(PRIVATE_KEY_PATH))).toString('base64');
console.log(`  ✓ ZIP signed (sha256 ${zipSha.slice(0, 12)}…)`);

mkdirSync(join(OUT, 'updates'), { recursive: true });
writeFileSync(join(OUT, 'updates', 'latest.json'), `${JSON.stringify({
  tag_name: `v${version}`,
  name: `Reazix Billing ${version}`,
  body: top[3].trim(),
  html_url: `${SITE}/help/support.html#whats-new`,
  published_at: `${top[2]}T00:00:00Z`,
  assets: [{
    name: `Reazix-Billing-v${version}.zip`,
    browser_download_url: `${SITE}/download/Reazix-Billing-v${version}.zip`,
    size: zipBytes.length, sha256: zipSha, signature,
  }],
}, null, 2)}\n`);
console.log(`  ✓ updates/latest.json   v${version}`);

// 5. The front page sends visitors to the help home until a product page exists.
writeFileSync(join(OUT, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reazix Billing Software</title>
<meta http-equiv="refresh" content="0; url=help/">
<link rel="canonical" href="${SITE}/help/">
</head>
<body>
<p><a href="help/">Reazix Billing Software: help and user guide</a></p>
</body>
</html>
`);
console.log('  ✓ index.html            goes to help/');

// 6. Web server settings for nginx.
writeFileSync(join(OUT, 'nginx-billing.reazix.com.conf'), `# nginx site for billing.reazix.com. Copy the website files to /var/www/billing.reazix,
# put this file in /etc/nginx/sites-available/, link it into sites-enabled,
# then get HTTPS with: sudo certbot --nginx -d billing.reazix.com
server {
    listen 80;
    server_name billing.reazix.com;
    root /var/www/billing.reazix;
    index index.html;

    # The app asks for the newest version every few hours: never cache it.
    location = /updates/latest.json {
        add_header Cache-Control "no-store";
        add_header Access-Control-Allow-Origin "*";
    }
    # Installers are shown as text so people can read them before running.
    location ~ ^/install\\.(sh|ps1)$ {
        default_type text/plain;
        charset utf-8;
    }
    location /download/ {
        add_header Content-Disposition "attachment";
    }
    location / {
        try_files $uri $uri/ =404;
    }
    # Keep the server's own notes out of reach.
    location ~ (^/nginx-|\\.md$) { return 404; }
}
`);
writeFileSync(join(OUT, 'README.md'), `# billing.reazix.com

Built by \`npm run site\` in the Reazix Billing project. Do not edit these files
by hand: change the project and publish again.

| Path | What it is |
|---|---|
| \`help/\` | The help pages. Every ? button in the app opens one answer here. |
| \`updates/latest.json\` | The newest version. The app checks it to offer updates. |
| \`download/\` | The app ZIP, as \`Reazix-Billing.zip\` (latest) and with its version. |
| \`install.ps1\`, \`install.sh\` | The one-line installers. |
| \`nginx-billing.reazix.com.conf\` | Web server settings. |

To put it online: copy everything except the two notes files to
\`/var/www/billing.reazix\` on the VPS, set up nginx with the .conf file, and
point billing.reazix.com (a DNS A record) at the VPS.
`);
console.log('  ✓ nginx-billing.reazix.com.conf, README.md\n');
