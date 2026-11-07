# Reazix Billing Software

**GST billing, invoicing and returns for Indian businesses, by [Reazix](https://reazix.com).**

Reazix Billing runs on your own Windows, Mac or Linux computer and opens in your
web browser. Your invoices, clients and settings stay on that computer: there is
no account, no cloud and no subscription. One payment gives you lifetime use and
3 years of updates.

- Website and downloads: <https://billing.reazix.com>
- Help pages: <https://billing.reazix.com/help/>
- Contact: [contact@reazix.com](mailto:contact@reazix.com)

---

## What it does

| Area | Included |
|---|---|
| **Invoices** | Tax invoice, proforma, quotation, credit note, bill of supply and delivery challan. CGST / SGST / IGST worked out from the place of supply. PDF, print and WhatsApp. |
| **GST returns** | GSTR-1 and GSTR-3B JSON for the GST portal, GSTR-2B reconciliation, HSN summary, e-Way Bill and e-invoice JSON. |
| **Barcode scanning** | Give each product a barcode, then scan it on an invoice with a USB or Bluetooth scanner. |
| **Stock and buying** | Products and services, purchase bills and orders, stock reports, low-stock alerts and manufacturing. |
| **Money** | Payments and receipts, outstanding by party, expenses, cash book, TDS / TCS reports and income tax helpers. |
| **Many businesses** | Several businesses (GSTINs) in one app, each with its own books and invoice numbers. |
| **Safety** | Works offline, daily backups kept for 30 days, an optional backup copy on another drive, and an optional PIN lock. |

---

## Install

**Windows:** press Windows + R, paste this line and press Enter:

```powershell
powershell -ExecutionPolicy Bypass -c "[Net.ServicePointManager]::SecurityProtocol='Tls12'; irm https://billing.reazix.com/install.ps1 | iex"
```

**Mac or Linux:** open Terminal, paste this line and press Return:

```bash
curl -fsSL https://billing.reazix.com/install.sh | bash
```

The install needs no administrator rights. It adds a **Reazix Billing** icon (the
blue **R**) to your Desktop and Start menu; click it every day to start the app.

You can also download `Reazix-Billing.zip` from <https://billing.reazix.com>,
extract it, and open the launcher for your computer inside it.

---

## Updating

When a new version is ready, the app shows **Update** in the menu. Click it: the
app backs up your data first, then installs the new version. Your invoices and
settings are kept.

---

## Your data

Everything is saved in the app's `data` folder on your computer. Every day the
app also saves a dated backup in `Documents/Reazix Billing Backups` and keeps
the last 30 days. In **Settings → Backup** you can add a second backup folder,
for example on another drive or a USB disk.

The app talks only to your own computer. It goes online only to check for
updates (turn on **Offline mode** to stop that), when you click a help or
WhatsApp link, and for Google Drive if you set it up.

---

## For developers

Needs Node.js 18 or newer.

```bash
npm install
npm start        # builds the app and serves it on http://localhost:47371
npm run dev      # live reload on http://localhost:5173, API on 47371
npm test         # unit tests, then the browser smoke test (Firefox)
npm run release:zip   # builds release-build/Reazix-Billing-v<version>.zip
```

The app's screens are in `src/` (React and Vite), its server is `server.js`
(Express), and the installers and launchers are in `release-templates/`.
Product names, links and the contact address used by the screens are in
`src/brand.js`.

---

## Licence

Copyright (c) 2026 Reazix. All rights reserved. See [LICENSE](LICENSE).
Parts of the software come from other authors under their own licences; see
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
