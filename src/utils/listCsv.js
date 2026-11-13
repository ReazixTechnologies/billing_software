// v1.10.83 (#121) - Products and Clients CSV import, and their sample files.
// Reported: "for import features where are the sample files to fill data".
// Pure functions (no fetch / React), so scripts/csv-test.mjs can import each
// sample back through the same code the screens use. Headings are matched
// loosely (case, spaces, %, / ignored), so the Products export imports back.
import { toCsvLine } from '../utils.js';
import { rowsToRecords, toNum } from './bulkCsv.js';
import { cleanBarcode, productBarcodes } from './products.js';

// Headings are compared without case, spaces, dots, %, /, -, ( ), so
// "P.Rate", "M.R.P." and "GST %" match "prate", "mrp" and "gst". Besides our
// own, the headings other billing programs export (MARG, Tally, Busy, Vyapar)
// are listed, so a shop moving here can choose that program's Excel file.
// Within a field the first-listed heading wins when a file has two of them.
const PRODUCT_FIELDS = {
  name: ['name', 'product', 'product name', 'item', 'item name', 'item description', 'particulars', 'stock item', 'name of item'],
  type: ['type', 'kind', 'goods or service', 'goods/service'],
  hsn: ['hsn', 'hsn code', 'sac', 'sac code', 'hsn/sac', 'hsn/sac code', 'hsn no'],
  barcode: ['barcode', 'bar code', 'ean', 'upc', 'sku'],
  // The old program's own item code: kept as the barcode when there is none
  // (typing it on an invoice finds the product, as it did there).
  code: ['item code', 'product code', 'code', 'alias', 'part no'],
  unit: ['unit', 'uom', 'units', 'unit name'],
  purchasePrice: ['purchase price', 'purchase rate', 'p.rate', 'pur rate', 'pur. rate', 'p rate', 'cost price', 'cost', 'cost rate', 'landing cost', 'ptr'],
  sellingPrice: ['selling price', 'rate', 'price', 'sale price', 's.rate', 'sale rate', 'sales rate', 'sales price', 'selling rate'],
  mrp: ['mrp', 'm.r.p.', 'm.r.p'],
  taxPercent: ['gst%', 'gst rate', 'tax%', 'tax', 'taxpercent', 'igst', 'igst%', 'igst rate', 'gst', 'tax rate', 'gst percentage', 'gst slab'],
  sgst: ['sgst', 'sgst%', 'sgst rate'],
  cgst: ['cgst', 'cgst%', 'cgst rate'],
  stock: ['stock', 'quantity', 'opening stock', 'closing stock', 'cl. stock', 'cl stock', 'qty', 'balance qty', 'current stock', 'closing qty', 'stock qty'],
  description: ['description'],
};

const CLIENT_FIELDS = {
  name: ['name', 'client', 'client name', 'customer', 'customer name', 'party', 'party name', 'ledger', 'ledger name', 'account name', 'name of ledger'],
  gstin: ['gstin', 'gst number', 'gst no', 'gstin/uin', 'gstin no', 'gst', 'gst in'],
  phone: ['phone', 'mobile', 'phone number', 'mobile no', 'phone no', 'contact no', 'mobile 1', 'phone 1', 'contact', 'mobile number', 'whatsapp'],
  email: ['email', 'email id', 'e-mail', 'mail'],
  address: ['address', 'address 1', 'address1', 'add1', 'address line 1'],
  address2: ['address 2', 'address2', 'add2', 'address line 2'],
  address3: ['address 3', 'address3', 'add3', 'city', 'station'],
  state: ['state', 'state name'],
  group: ['group', 'under', 'ledger group', 'account group', 'group name'],
};

// A totals line at the foot of an exported report is not a product or client.
const TOTAL_ROW = /^(grand\s*)?total\b|^sub\s*total\b/i;

// A products file names at least one thing a product has besides its name;
// without one it is some other report (a trial balance's PARTICULARS column
// would otherwise come in as products called CASH-IN-HAND).
const PRODUCT_DETAIL = ['type', 'barcode', 'code', 'hsn', 'unit', 'purchasePrice', 'sellingPrice', 'mrp', 'taxPercent', 'stock'];
const CLIENT_DETAIL = ['gstin', 'phone', 'email', 'address', 'address2', 'address3', 'state'];
const NUMBER_FIELDS = ['purchasePrice', 'sellingPrice', 'mrp', 'taxPercent', 'stock'];

// A printed report repeats its title and headings at the top of every page
// ("PRICE LIST ... Page No..2", "S.NO. ITEM DESCRIPTION RATE"): such a row
// has words where the numbers go, and repeats a heading or says "page".
const isPageHeading = (r, header, colOf) => {
  const nums = NUMBER_FIELDS.filter((f) => colOf[f] !== undefined && r[f] !== '');
  if (!nums.length || nums.some((f) => Number.isFinite(toNum(r[f])))) return false;
  const heads = new Set((header || []).map((h) => String(h).trim().toLowerCase()).filter(Boolean));
  return Object.entries(r).some(([k, v]) => k !== '_line' && (heads.has(String(v).trim().toLowerCase()) || /\bpage\b|continued/i.test(String(v))));
};

// Already in the list (trimmed name, any case), or a repeat inside the file.
const dedupe = (existing) => {
  const known = new Set((existing || []).map((x) => String(x.name || '').trim().toLowerCase()));
  return (name) => {
    const k = name.toLowerCase();
    if (known.has(k)) return true;
    known.add(k);
    return false;
  };
};

// Text (or spreadsheet rows) -> { products, skipped, errors, notes }. A row
// with a problem is left out and named in errors; a name already saved is
// skipped (importing twice is safe). notes counts what an import screen should
// point out: prices taken from MRP, products at 0% GST, stock below zero.
export function productsCsvToList(text, existing = []) {
  const { records, colOf = {}, header } = rowsToRecords(text, PRODUCT_FIELDS);
  const seen = dedupe(existing);
  const barcodes = new Set((existing || []).flatMap((x) => productBarcodes(x).map((b) => b.toLowerCase())));
  // A product already saved: the file can still add barcodes to it (MARG's
  // batch-wise stock report has one per purchase lot). Nothing else changes.
  const saved = new Map((existing || []).map((x) => [String(x.name || '').trim().toLowerCase(), x]));
  const updates = new Map(); // saved product -> a copy with its new barcodes
  const skippedSaved = new Set();
  const out = { products: [], updates: [], skipped: 0, errors: [], notes: { fromMrp: 0, zeroGst: 0, negativeStock: 0, merged: 0, barcodesAdded: 0 } };
  const addCode = (product, code) => {
    const key = code.toLowerCase();
    if (!code || barcodes.has(key)) return false;
    barcodes.add(key);
    if (!product.barcode) product.barcode = code;
    else product.barcodes = [...(product.barcodes || []), code];
    return true;
  };
  if (records.length && colOf.name !== undefined && !PRODUCT_DETAIL.some((f) => colOf[f] !== undefined)) {
    out.errors.push('This file has names but no price, stock, HSN or code column, so it does not look like an item list. Choose the item (stock) list instead.');
    return out;
  }
  // The same item on several rows (one per batch, in a medical or FMCG stock
  // report) is one product: its stock is added up.
  const inFile = new Map();
  for (const r of records) {
    const name = r.name || '';
    if (!name || TOTAL_ROW.test(name) || isPageHeading(r, header, colOf)) continue;
    const again = inFile.get(name.toLowerCase());
    if (again) {
      const more = toNum(r.stock, null);
      if (again.stock !== undefined && Number.isFinite(more)) again.stock += more;
      // The later lot's prices are the current ones (reports list lots oldest first).
      const sell = toNum(r.sellingPrice) || toNum(r.mrp);
      if (sell > 0) { again.sellingPrice = sell; again.rate = sell; }
      if (toNum(r.purchasePrice) > 0) again.purchasePrice = toNum(r.purchasePrice);
      addCode(again, cleanBarcode(r.barcode));
      out.notes.merged++;
      continue;
    }
    const savedOne = saved.get(name.toLowerCase());
    if (savedOne) {
      const code = cleanBarcode(r.barcode) || cleanBarcode(r.code);
      if (code && !barcodes.has(code.toLowerCase())) {
        const upd = updates.get(savedOne) || { ...savedOne, barcodes: [...(savedOne.barcodes || [])] };
        if (addCode(upd, code)) { updates.set(savedOne, upd); out.notes.barcodesAdded++; }
      }
      if (!skippedSaved.has(savedOne)) { skippedSaved.add(savedOne); out.skipped++; }
      continue;
    }
    const type = String(r.type || '').toLowerCase();
    if (type && !/^(goods?|g|products?|services?|s)$/.test(type)) { out.errors.push(`Row ${r._line} (${name}): Type must be Goods or Service`); continue; }
    const service = type.startsWith('s');
    // No selling price (MARG leaves Rate at 0 when the shop sells at MRP): use the MRP.
    let selling = r.sellingPrice;
    const fromMrp = !toNum(selling) && toNum(r.mrp) > 0;
    if (fromMrp) selling = r.mrp;
    // GST split into SGST + CGST only: add them up.
    let tax = r.taxPercent;
    if (!toNum(tax) && (toNum(r.sgst) || toNum(r.cgst))) tax = String(toNum(r.sgst) + toNum(r.cgst));
    const nums = { purchasePrice: toNum(r.purchasePrice), sellingPrice: toNum(selling), taxPercent: toNum(tax), stock: toNum(r.stock, null) };
    const bad = Object.entries(nums).find(([k, v]) => (k === 'stock' ? v !== null && !Number.isFinite(v) : !Number.isFinite(v)));
    if (bad) { out.errors.push(`Row ${r._line} (${name}): ${bad[0] === 'stock' ? 'stock' : bad[0] === 'taxPercent' ? 'GST %' : 'price'} must be a number`); continue; }
    if (nums.taxPercent < 0 || nums.taxPercent > 100) { out.errors.push(`Row ${r._line} (${name}): GST % must be 0 to 100`); continue; }
    const barcode = cleanBarcode(r.barcode) || cleanBarcode(r.code);
    // Excel shows long numbers as 8.9E+12 and saves them that way: the digits are gone.
    if (/^\d(\.\d+)?e\+?\d+$/i.test(barcode)) { out.errors.push(`Row ${r._line} (${name}): Excel changed the barcode to ${barcode}. Format the column as Text and type it again`); continue; }
    if (seen(name)) { out.skipped++; continue; }
    if (barcode && barcodes.has(barcode.toLowerCase())) { out.errors.push(`Row ${r._line} (${name}): barcode ${barcode} is already used by another product`); continue; }
    if (barcode) barcodes.add(barcode.toLowerCase());
    if (fromMrp) out.notes.fromMrp++;
    if (!service && !nums.taxPercent) out.notes.zeroGst++;
    out.products.push({
      name,
      ...(service ? { kind: 'service' } : {}),
      hsn: r.hsn || '',
      ...(barcode ? { barcode } : {}),
      purchasePrice: nums.purchasePrice,
      sellingPrice: nums.sellingPrice,
      rate: nums.sellingPrice, // mirror for older readers
      taxPercent: nums.taxPercent,
      unit: r.unit || 'Nos',
      // A service has no stock; goods with a blank stock are "not tracked yet".
      ...(!service && nums.stock !== null ? { stock: nums.stock } : {}),
      description: r.description || '',
    });
    inFile.set(name.toLowerCase(), out.products[out.products.length - 1]);
  }
  out.notes.negativeStock = out.products.filter((x) => x.stock < 0).length;
  out.updates = [...updates.values()];
  return out;
}

export function clientsCsvToList(text, existing = []) {
  const { records, colOf = {} } = rowsToRecords(text, CLIENT_FIELDS);
  const seen = dedupe(existing);
  const out = { clients: [], skipped: 0, errors: [], notes: { suppliers: 0 } };
  // An item list chosen here by mistake: names with prices or stock, nothing about a party.
  if (records.length && !CLIENT_DETAIL.some((f) => colOf[f] !== undefined)) {
    const asItems = rowsToRecords(text, PRODUCT_FIELDS).colOf || {};
    if (PRODUCT_DETAIL.some((f) => asItems[f] !== undefined)) {
      out.errors.push('This looks like an item list (it has prices or stock, and no phone, GSTIN or address). Import it on the Products screen; here choose the party (customer) list.');
      return out;
    }
  }
  for (const r of records) {
    const name = r.name || '';
    if (!name || TOTAL_ROW.test(name)) continue;
    // A full ledger list (MARG, Tally) also has suppliers, banks and expense
    // heads; only customers (Sundry Debtors, or no group) are clients.
    if (r.group && !/debtor|customer|client/i.test(r.group)) { out.notes.suppliers++; continue; }
    if (seen(name)) { out.skipped++; continue; }
    const address = [r.address, r.address2, r.address3].map((a) => String(a || '').trim()).filter(Boolean).join(', ');
    out.clients.push({ name, address, state: r.state || '', gstin: (r.gstin || '').toUpperCase(), email: r.email || '', phone: r.phone || '' });
  }
  return out;
}

// Sample files (demo data, not real businesses) for "Download sample file".
export const PRODUCTS_SAMPLE = [
  toCsvLine(['Name', 'Type', 'HSN/SAC', 'Unit', 'Purchase Price', 'Selling Price', 'GST %', 'Stock', 'Description', 'Barcode']),
  toCsvLine(['Demo A4 Paper Ream 75 GSM', 'Goods', '4802', 'Nos', 220, 280, 18, 50, 'Sample goods row - replace with your own', '8900000000017']),
  toCsvLine(['Demo Printing service', 'Service', '998912', 'Page', '', 5, 18, '', 'Sample service row - a service has no stock', '']),
].join('\n');

export const CLIENTS_SAMPLE = [
  toCsvLine(['Name', 'GSTIN', 'Phone', 'Email', 'Address', 'State']),
  toCsvLine(['Demo Traders', '27AAAAA0000A1Z5', '9800000001', 'accounts@demo-traders.example', 'Shop 4, Demo Market, Pune', 'Maharashtra']),
  toCsvLine(['Sample Studio', '', '9800000002', 'hello@sample-studio.example', '12 Sample Street, Kolkata', 'West Bengal']),
].join('\n');
