# Release Checklist

Users of this app are **not developers**. They are shop owners and
accountants who will read the release note once, on a phone, and decide
whether to act. A release note that only lists what changed is useless to
them — it must also tell them **what to do**.

**Rule: every user-facing release note carries a "How to update" section.
No exceptions, including hotfixes and one-line patches.**

"User-facing" means both places a user can land:

1. `CHANGELOG.md` in the repo
2. The **GitHub Release** body (this is the one most users actually see —
   it is what the Releases page and the download link show)

Both get the same "How to update" block. Do not write it in one and skip
the other.

---

## The mandatory "How to update" block

Copy this into every release. Fill in the parts in `<angle brackets>`,
delete the lines that do not apply — but never delete the section.

```markdown
## How to update

**Current version:** <OLD>  →  **New version:** <NEW>

### If the in-app Update button works for you
1. Open the Reazix Billing launcher.
2. Click **Update**.
3. Wait for "Update complete", then click **Stop Server**, then **Open App**.

That is all — your data is not touched.

### If the Update button does not work (or you are unsure)
1. Download `Reazix-Billing-v<NEW>.zip` from the Assets section below.
2. Close the app completely (click **Stop Server** first if it is running).
3. Extract the ZIP over your existing Reazix Billing folder, replacing
   files when Windows asks.
4. Double-click the launcher again.

### Is my data safe?
Yes. Invoices, clients, products and settings live in `_system/data/`,
which an update never touches. The updater also takes an automatic backup
to `Documents\Reazix Billing Backups\` before it changes anything.

### Something went wrong?
Open an issue with a screenshot of the error:
mailto:contact@reazix.com
```

### When a release BREAKS the updater

If the bug being fixed is in the updater itself, the in-app path cannot
save the user — say so at the very top, in bold, before anything else:

> ⚠️ **The Update button cannot fix this** — the updater is the broken
> component. Please download the ZIP below manually, this one time.

---

## Writing the rest of the note

Write for the person who reported it, not for the compiler.

- **Lead with the symptom the user saw**, in their words. They recognise
  "Print button did nothing", not "TDZ ReferenceError in buildPDF".
- **Credit the reporter** by @handle. It is why people report at all.
- **Say which buttons/screens are affected.** A user cannot map
  `start-windows.ps1` to "Open App" — do it for them.
- Keep the technical root cause, but put it **below** the user-facing
  part, not above it.

---

## Publish steps

```bash
# 1. Bump the version
#    package.json "version" is the single source of truth.

# 2. Write CHANGELOG.md — including the How to update block above.

# 3. Build
npm run release:zip

# 3b. Try the ZIP on ONE test PC (or one friendly shop) first: make an
#     invoice, print it, open Settings and Reports. Only then go on.

# 4. Build the website folder. This SIGNS the ZIP with
#    license-tool/private-key.pem and writes updates/latest.json with the
#    signature. Upload the folder's contents to billing.reazix.com.
#    Since 1.0.2 the updaters (update-windows.ps1, update-unix.sh) install
#    ONLY a ZIP whose signature verify-update.cjs accepts, so a hacked
#    website cannot push its own files to the shops. An unsigned
#    latest.json makes every shop's Update stop with "no signed ZIP".
npm run site

# 4b. (Optional) Also publish ONE ZIP on GitHub, under the fixed name (from v1.10.76: two identical
#    ZIPs on a release confused people). The README's Download button links
#    to releases/latest/download/Reazix-Billing.zip, which only resolves if
#    the latest release has a file of exactly that name. The in-app and
#    launcher updaters take the first *.zip, so the name does not matter to
#    them. See ERR-003: one tagged release per version.
cp "release-build/Reazix-Billing-v<NEW>.zip" "release-build/Reazix-Billing.zip"
gh release create v<NEW> "release-build/Reazix-Billing.zip" \
  --target main --title "v<NEW> — <short user-facing summary>" \
  --notes-file <notes>
curl -sIL -o /dev/null -w "%{http_code}\n" \
  https://billing.reazix.com/download/Reazix-Billing.zip

# 5. Verify what the in-app updater will actually see
curl -s https://billing.reazix.com/updates/latest.json \
  --jq '{tag: .tag_name, asset: .assets[0].name}'
```

The tag and the asset filename must **both** match the new version. The
updater shows the user `tag_name`, so a mismatch means every user is told
the wrong version number.

---

## The master key (license-tool/private-key.pem)

It signs every product key and every update. **Never** commit, email or
upload it, and never put it on the website. It is git-ignored. If it is
missing on the release PC, copy it from the backup pen drive. If it ever
leaks, anyone can make product keys and fake updates: tell the team lead
the same day. Interns do not need it.

---

## Updating the shops (interns)

For each shop: open the app, click **Update** (or **Check for Updates** if
the shop uses Offline mode), wait for the restart, check the version in the
menu, make one test invoice and delete it, then tell the owner what is new
(read them the CHANGELOG lines). Invoices, settings and the product key are
kept: the update never touches the `data` folder and backs it up first. The
shop is not asked for the product key again. If the update fails, nothing
is changed: note the message on screen and send it to the team.

---

## Before you publish

- [ ] `package.json` version bumped
- [ ] `CHANGELOG.md` entry written, **with** the How to update block
- [ ] GitHub Release body has the **same** How to update block
- [ ] Reporter credited by @handle
- [ ] Affected buttons/screens named in plain language
- [ ] If the updater itself was broken — the ⚠️ manual-download warning is
      at the top
- [ ] `npm run release:zip` succeeded. It runs `npm run lint` (0 errors) and
      the unit tests first, and stops if either fails. It also refuses to hand you a ZIP
      unless that ZIP **extracts, installs, boots and passes the full smoke
      suite** (see `scripts/verify-release.mjs`). A failing build deletes
      the ZIP rather than leaving something shippable lying about.
      It also runs the ASCII guard (ERR-001), the server import-graph
      check (ERR-009), and refuses a ZIP with `\` paths or CRLF shell
      scripts (ERR-014).
- [ ] If `update-unix.sh`, the ZIP layout or any Unix launcher changed:
      `npm run test:update-unix` passes. It runs the Linux / NAS updater in
      real Alpine and Debian containers (needs Docker, ERR-014).
- [ ] `releases/latest` verified to return the new tag **and** new asset
- [ ] Exactly ONE asset, `Reazix-Billing.zip`, and the README Download button returns 200
- [ ] Reply posted to whoever reported it
