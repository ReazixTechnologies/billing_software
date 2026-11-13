# Changelog

All notable changes to **Reazix Billing Software** are listed here.

---

## [1.0.6] - 2026-11-13

**New: bring your products and customers from MARG, Tally, Busy or Vyapar.**

### How to update

**Current version:** 1.0.5  →  **New version:** 1.0.6

Click **Update** in the app's menu. Your invoices and settings are kept.

### New
- **Import from Excel:** on Products and Clients, **Import (Excel / CSV)**
  now takes the Excel file (.xls or .xlsx) your old program exports, as it
  is: no need to change it to CSV or fill in our sample file.
- The old program's columns are found by themselves: item code, HSN, GST
  (or SGST + CGST), rate, purchase rate, MRP, stock, unit; party name,
  GSTIN, mobile, address.
- **A check before importing:** products at 0% GST (pick their GST),
  stock below zero (start it at 0), and products with no selling rate
  (the MRP is used).
- Report titles, repeated page headings and Total lines are left out.
  Batches of the same medicine are joined into one product with the stock
  added up. From a ledger list only customers are added, not suppliers or
  banks.
- Choosing the wrong file (a trial balance, or the item list on Clients)
  is caught and explained instead of importing wrong data.

---

## [1.0.5] - 2026-11-13

**New: Staff screen with sales commission.**

### How to update

**Current version:** 1.0.4  →  **New version:** 1.0.5

Click **Update** in the app's menu. Your invoices and settings are kept.

### New
- **Staff screen** (in the menu): add each person who works for you, with
  phone, role, joining date and commission %.
- **Commission report:** see each staff member's sales (before GST) and
  commission for this month, last month, this financial year or any dates.
  Click a name to see their invoices. Export to Excel or CSV.
- **Attended By on the invoice** now suggests your staff names as you type.
  The name is kept with the invoice for the report and no longer printed on
  the customer's bill.
- **Faster typing on the invoice:** Shift+Enter in an item line jumps to
  Payment. On Payment, Enter moves to the next choice (Unpaid, Paid, UPI,
  Cash...), and Shift+Enter moves on to Invoice Details.
- Staff are kept in backups and come back with Restore.

---

## [1.0.4] - 2026-11-12

**Installing on a new PC works first time.**

### How to update

**Current version:** 1.0.3  →  **New version:** 1.0.4

Click **Update** in the app's menu. Your invoices and settings are kept.

### Fixed
- **Install on Windows:** no more "Access to the path ... is denied" while
  installing. Windows Search reads the new files for a moment; the
  installer now waits and tries again.
- **First start on a new PC:** the app window opens at once on the product
  key screen, instead of waiting 90 seconds and saying the server did not
  answer (Windows and Mac).

---

## [1.0.3] - 2026-11-12

**Updates finish by themselves, on Windows and Mac.**

### How to update

**Current version:** 1.0.2  →  **New version:** 1.0.3

Click **Update** in the app's menu. Your invoices and settings are kept.
On Windows, if the app keeps showing "Updating…" for more than 3 minutes,
close the app and open it again: the update is already installed. From the
next update on, this does not happen.

### Fixed
- **Windows: Update no longer stays on "Updating…"** after the work is done.
- **The app restarts by itself after an update** (Windows and Mac), and
  opens in the new version. No need to close and open it.
- **Mac: shortcut keys are shown with the Control key** (Control + Q, not
  ⌘ + Q, which closes the browser). Both keys still work.

---

## [1.0.2] - 2026-11-12

**Shortcut keys, printing without the print window, and a roomier invoice screen.**

### How to update

**Current version:** 1.0.1  →  **New version:** 1.0.2

Click **Update** in the app's menu. Your invoices and settings are kept.

### New
- **Shortcut keys like MARG:** Alt+N new bill, Alt+M bill list, Alt+P
  purchases, Alt+C delivery challan, Alt+V receipts, Ctrl+I products,
  Ctrl+L clients, Alt+F10 reports, F2 new (on any screen), F11 print,
  Ctrl+F1 list of keys, Ctrl+Q lock. Change or turn off any key in
  Settings › Shortcut keys.
- **Enter goes to the next box** while filling a bill. Enter on the last box
  of an item row adds the next row. Turn it off in Settings › Shortcut keys.
- **Print without the print window:** in Settings › Print & PDF, choose your
  printer once. After that, Print sends the bill straight to it. If the
  printer does not take it, the normal print window opens instead.
- **Print also saves the bill's PDF** in Saved Invoices.
- **Phone No. and Attended By** on the Billed To card, both optional.
  Attended By is printed on the bill when filled.

### Safer
- **Updates are checked before they install:** every update is signed by
  Reazix, and the app installs only a signed update. A changed or fake file
  is refused and nothing on your PC is touched.
- **Only this PC can open the app's data:** a website cannot read your
  invoices through the browser, even with tricks.

### Changed
- **Invoice screen:** the bill preview is on the right with the Invoice Type
  card under it, and the form side is wider. The preview remembers where you
  left it and scrolls to the item you are typing.

---

## [1.0.1] - 2026-11-09

**Product key activation.**

### How to update

**Current version:** 1.0.0  →  **New version:** 1.0.1

Click **Update** in the app's menu. Your invoices and settings are kept.
After the update the app asks once for your product key.

### Changed
- **Product key:** the app now opens with a product key from Reazix, entered
  once and valid for life. The first screen shows this PC's code: send it to
  Reazix and paste the key you get back. One key works on one PC.
- **Shop details from the key:** a key can carry the business name, GSTIN and
  address. They fill the invoice header by themselves and stay fixed.
- **More counters:** a shop's second (third...) counter gets its own key, the
  same header, and its own invoice numbers (C2/..., C3/...), so two counters
  never print the same number.

---

## [1.0.0] - 2026-11-06

**The first release of Reazix Billing.**

### How to update

**Current version:** none  →  **New version:** 1.0.0

This is the first version, so there is nothing to update. Later versions
arrive through **Update** in the app's menu, or by downloading
`Reazix-Billing.zip` from billing.reazix.com and opening it over your current
folder. Your invoices and settings are kept.

### Included
- **GST invoicing:** tax invoices, proforma, credit notes, bill of supply and
  delivery challans, with CGST / SGST / IGST worked out from the place of supply.
- **GST returns:** GSTR-1 and GSTR-3B JSON exports, GSTR-2B reconciliation,
  e-Way Bill and e-invoice JSON.
- **Barcode scanning:** give each product a barcode, then scan it on an
  invoice with a USB or Bluetooth scanner. Each scan adds the product, or one
  more of it.
- **Stock and purchases:** products, purchase bills and orders, stock reports
  and manufacturing.
- **Money:** payments, receipts, expenses, cash book, TDS / TCS reports and
  income tax helpers.
- **Works offline:** your data stays on your computer, with daily backups and
  an optional PIN lock.

---
