# Security Policy

Reazix Billing Software handles invoices, GSTINs and client records for
real businesses. Reports are taken seriously.

## Supported versions

Reazix Billing ships as a downloadable app. Only the **latest release** receives security fixes — there are no
maintained back-branches, and fixes are not backported.

| Version | Supported |
| ------- | --------- |
| Latest release ([billing.reazix.com](https://billing.reazix.com)) | ✅ |
| Anything older | ❌ — please update first |

If you are reporting against an older build, please confirm it still
happens on the latest release. Updating is the launcher's **Update**
button, or a manual ZIP download.

## Reporting a vulnerability

**Please report security problems privately, by email.**

Email **contact@reazix.com** with `SECURITY` in the subject.

Please include:

- Version (shown in the app's Control Panel / launcher)
- Operating system and browser — **the browser matters**; several real
  bugs here have reproduced only in Firefox and not Chrome
- Steps to reproduce, and what an attacker gains
- A screenshot or the browser console output if relevant

**Never include real invoice data, client details or GSTINs in a report.**
Reproduce with dummy data.

### What to expect

| Stage | Target |
| ----- | ------ |
| Acknowledgement | within 7 days |
| Initial assessment (valid / not / severity) | within 14 days |
| Fix released for a confirmed high or critical issue | as soon as practical, typically the next release |

This is maintained by one person alongside other work — these are honest
targets, not a commercial SLA. If you have not heard back in 14 days,
please chase; it means the message was missed, not ignored.

If a report is declined you will get a reason, not silence.

## Scope

This app is **offline-first and runs entirely on the user's own machine**.
The bundled server binds to `127.0.0.1` and data lives in a local
`_system/data/` folder. There is no hosted backend and no multi-tenant
service, so the threat model is not a typical web app's.

**In scope**

- Code execution or file access beyond the app's own folder
- Anything reachable from another machine on the network (the server is
  meant to be loopback-only)
- XSS or HTML injection via invoice fields, client names, rich-text Terms,
  imported JSON/CSV, or OCR'd content
- Content Security Policy weaknesses or bypasses
- Tampering with or exfiltrating local invoice data
- Supply-chain issues in shipped dependencies
- Flaws in backup, restore or the in-app updater — including anything
  letting an update pull code from an unintended source

**Out of scope**

- Anything requiring the attacker to already have the user's Windows
  account or physical machine access
- Missing hardening headers with no demonstrated impact
- Vulnerabilities only in `devDependencies`, which are not shipped to
  users (`npm run release:zip` ships runtime dependencies only)
- Automated scanner output with no working proof of concept
- Social engineering, or reports about a fork or modified build

## Disclosure

Coordinated disclosure. Please give a reasonable window to ship a fix
before publishing — users have to download and install an update by hand,
so a fix is not on anyone's computer until they update.

Reporters are credited in the release notes unless they would rather stay
anonymous.

## For users

- Download **only** from [billing.reazix.com](https://billing.reazix.com).
  Copies hosted anywhere else are not published by us and have not been
  checked.
- Keep automatic backups on — the updater writes one to
  `Documents\Reazix Billing Backups\` before applying any update.
- Your data never leaves your machine unless you explicitly export it or
  turn on Google Drive backup.
