// Reading a spreadsheet for Products / Clients import, and the headings of
// other billing programs (MARG, Tally, Busy, Vyapar), so a shop moving here
// chooses that program's Excel export as it is.
//
// scripts/fixtures/marg-items-demo.xls is made-up demo data laid out as a
// MARG item list (.xls, Excel 97-2003): a title row, the headings on row 3,
// 400 items (some names in Devanagari, so the strings are 16-bit and run over
// several records), and a Grand Total line.
//
// Run: `node scripts/sheetread-test.mjs`

import { readFileSync } from 'node:fs';
import { readSheet } from '../src/utils/sheetRead.js';
import { buildXlsx } from '../src/utils/xlsx.js';
import { productsCsvToList, clientsCsvToList, PRODUCTS_SAMPLE } from '../src/utils/listCsv.js';

let passed = 0, failed = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label}\n     expected: ${b}\n     actual:   ${a}`); }
}
const throwsMessage = (fn) => { try { fn(); return ''; } catch (e) { return e instanceof Error && e.message ? 'error' : 'odd throw'; } };
const enc = (s) => new TextEncoder().encode(s);

console.log('\nOld Excel (.xls) as MARG exports it');
const xls = readFileSync(new URL('./fixtures/marg-items-demo.xls', import.meta.url));
const rows = readSheet(xls);
eq(rows[0], ['DEMO TRADERS - ITEM LIST (demo data)'], 'the title row is read');
eq(rows[1], ['ItemCode', 'Name', 'HSNCode', 'SGST', 'CGST', 'IGST', 'Rate', 'P.Rate', 'M.R.P.', 'Stock', 'Unit'], 'the headings are read');
eq(rows.length, 403, 'title + headings + 400 items + total (blank rows dropped)');
eq(rows[2].slice(0, 3), ['100', 'साबण demo 0', '6203'], 'a 16-bit (Devanagari) name and text codes');
eq(rows[401][1], 'Demo item with a long name to fill strings 399', 'a string far into the list (after a CONTINUE record)');
eq(rows[11][1], 'साबण demo 9', 'a 16-bit string after the first CONTINUE is right');
eq([rows[2][7], rows[3][7]], [60, 60.5], 'numbers (whole and decimal)');

const p = productsCsvToList(rows, []);
eq([p.products.length, p.errors.length], [400, 0], '400 products, no errors; the Grand Total line is left out');
const p0 = p.products[0];
eq([p0.name, p0.barcode, p0.hsn, p0.purchasePrice, p0.unit], ['साबण demo 0', '100', '6203', 60, 'PCS'], 'Item code -> barcode, HSNCode, P.Rate, Unit');
eq([p0.sellingPrice, p.products[1].sellingPrice], [150, 101], 'Rate 0 -> the MRP is the price; otherwise the Rate');
eq(p.products.slice(0, 4).map((x) => x.taxPercent), [0, 5, 12, 18], 'GST from IGST, or SGST + CGST when IGST is 0');
eq(p.notes, { fromMrp: 80, zeroGst: 100, negativeStock: 20, merged: 0 }, 'notes for the check screen');
eq(productsCsvToList(rows, p.products).skipped, 400, 'importing the same file again skips every product');

console.log('\nNew Excel (.xlsx)');
const x = readSheet(buildXlsx([['Stock Summary'], [], ['Item Name', 'Sale Rate', 'GST %', 'Cl. Stock', 'Pur. Rate'], ['Tea & "Coffee" <1kg>', 120, 5, 7, 90], ['Grand Total', '', '', 7, '']]));
eq(x, [['Stock Summary'], ['Item Name', 'Sale Rate', 'GST %', 'Cl. Stock', 'Pur. Rate'], ['Tea & "Coffee" <1kg>', 120, 5, 7, 90], ['Grand Total', '', '', 7]], 'rows, with special characters, from the app\'s own .xlsx');
const xp = productsCsvToList(x).products;
eq(xp.map((q) => [q.name, q.sellingPrice, q.taxPercent, q.stock, q.purchasePrice]), [['Tea & "Coffee" <1kg>', 120, 5, 7, 90]], 'Busy / Tally headings: Sale Rate, Cl. Stock, Pur. Rate');

console.log('\nHTML saved as .xls, tab-separated text, CSV');
const html = readSheet(enc('<html><body><table><tr><th>Party Name</th><th>GSTIN/UIN</th><th>Mobile No</th><th>Address 1</th><th>City</th><th>Group</th></tr>'
  + '<tr><td>Ravi &amp; Sons</td><td>27aaaaa0000a1z5</td><td>98000</td><td>Main Road</td><td>Pune</td><td>Sundry Debtors</td></tr>'
  + '<tr><td>Steel Supplier</td><td></td><td></td><td></td><td></td><td>Sundry Creditors</td></tr>'
  + '<tr><td>HDFC Bank</td><td></td><td></td><td></td><td></td><td>Bank Accounts</td></tr></table></body></html>'));
eq(html[1][0], 'Ravi & Sons', 'an HTML table is read, entities decoded');
const c = clientsCsvToList(html);
eq(c.clients, [{ name: 'Ravi & Sons', address: 'Main Road, Pune', state: '', gstin: '27AAAAA0000A1Z5', email: '', phone: '98000' }], 'MARG party list: customer kept, address lines joined');
eq(c.notes.suppliers, 2, 'suppliers and banks are left out of clients');
eq(readSheet(enc('Name\tRate\nPen\t10\n')), [['Name', 'Rate'], ['Pen', '10']], 'tab-separated text');
eq(productsCsvToList(readSheet(enc(PRODUCTS_SAMPLE))).products.length, 2, 'our own sample CSV still imports');
eq(readSheet(new Uint8Array([0xFF, 0xFE, ...new Uint8Array(new Uint16Array([...'Name,Rate\nPen,5'].map((ch) => ch.charCodeAt(0))).buffer)])), [['Name', 'Rate'], ['Pen', '5']], 'UTF-16 text (Excel "Unicode Text")');

console.log('\nDamaged files are refused, never hang');
eq(throwsMessage(() => readSheet(new Uint8Array([0xD0, 0xCF, 0x11, 0xE0, 1, 2, 3]))), 'error', 'a cut-short .xls');
eq(throwsMessage(() => readSheet(enc('PK\u0003\u0004garbage'))), 'error', 'a broken .xlsx');
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
let odd = 0;
const t0 = Date.now();
for (let i = 0; i < 150; i++) {
  const bad = new Uint8Array(xls);
  for (let k = 0; k < 20; k++) bad[rnd() % bad.length] = rnd() & 0xff;
  const r = throwsMessage(() => readSheet(bad));
  if (r === 'odd throw') odd++;
}
eq(odd, 0, '150 randomly damaged .xls files: read or refused with a message');
eq(Date.now() - t0 < 20000, true, 'and quickly (no endless loop)');

console.log('\nReal-world report shapes (MARG stock report, printed price list, medical batches)');
const stock = productsCsvToList([
  ['SHOP NAME'], ['STOCK REPORT AS ON DATE 09/11/2026'],
  ['Code', 'Product Name', 'Unit', 'Current Stock', 'Cost Price', 'Value', 'M.R.P.', 'Purchase Price', 'Sales Price', 'Company', 'Barcode'],
  ['', '', '', '', 'Deal', 'Free'],
  ['405', 'Denim Jeans', 'PCS', 2, 600, 1200, 1650, 680, 0, 'ZZ', ''],
  ['21', 'Formal Shirt', 'PCS', -17, 700, 0, 1049, 750, 1049, 'ZZ', '8901234567890'],
  ['', '', '', '', '', '', '', '', '', '', ''],
]);
eq(stock.products.map((q) => [q.name, q.barcode, q.purchasePrice, q.sellingPrice, q.stock, q.unit]),
  [['Denim Jeans', '405', 680, 1650, 2, 'PCS'], ['Formal Shirt', '8901234567890', 750, 1049, -17, 'PCS']],
  'Barcode before Code, Purchase Price before Cost Price, Current Stock, MRP when Sales Price is 0');
const priceList = productsCsvToList([
  ['SHOP NAME'], ['PRICE LIST'], ['S.NO.', 'ITEM DESCRIPTION', 'RATE'], ['ZZZZZZ 78'],
  [1, 'Blue Cargo', 1149], ['', '', 'Continued..2'], ['SHOP NAME'], ['PRICE', 'LIST        Page', 'No..2'],
  ['S.NO.', 'ITEM DESCRIPTION', 'RATE'], [2, 'Borgo TS', 875], ['Switch to some other software @ Rs.5,550'],
]);
eq([priceList.products.map((q) => [q.name, q.sellingPrice]), priceList.errors], [[['Blue Cargo', 1149], ['Borgo TS', 875]], []], 'a printed price list: page headings and adverts left out, no errors');
const batches = productsCsvToList([
  ['Code', 'Item Name', 'Batch No.', 'Exp. Date', 'HSN Code', 'GST %', 'MRP', 'PTR', 'Sale Rate', 'Stock Qty', 'Free Qty'],
  ['10045', 'DOLO 650 TAB', 'A1', '08/2027', '30049099', 12, 33.75, 24.1, 30.5, 420, 0],
  ['10045', 'DOLO 650 TAB', 'B7', '01/2028', '30049099', 12, 33.75, 24.1, 30.5, 80, 5],
]);
eq([batches.products.length, batches.products[0].stock, batches.products[0].purchasePrice, batches.notes.merged], [1, 500, 24.1, 1], 'medical: two batches of one item become one product, stock added, PTR as purchase price');
const trial = productsCsvToList([['', 'SHOP'], ['', 'PARTICULARS', '', 'OPENING BALANCE', 'DEBIT', 'CREDIT'], ['', '---- CASH-IN-HAND', '', '100 Dr', 5, 0]]);
eq([trial.products.length, trial.errors.length], [0, 1], 'a trial balance chosen as products is refused, not imported as CASH-IN-HAND');
const itemsAsClients = clientsCsvToList(rows);
eq([itemsAsClients.clients.length, itemsAsClients.errors.length], [0, 1], 'an item list chosen on Clients is refused');
eq(clientsCsvToList('Customer Name\nRavi\n').clients.length, 1, 'a plain list of client names still imports');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
