// v1.10.77 (#85) - product helpers for bulk edit and the stock report.
import { appliedStock, isCancelledBill, isServiceProduct } from '../utils.js';

const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));

// Barcodes are text: leading zeros count. Matching ignores case and outer
// spaces, because scanners and hand typing differ on both.
export const cleanBarcode = (v) => String(v ?? '').trim();
const barcodeKey = (v) => cleanBarcode(v).toLowerCase();

export const findByBarcode = (products, code) => {
  const key = barcodeKey(code);
  if (!key) return null;
  return (products || []).find((p) => barcodeKey(p.barcode) === key) || null;
};

// The first barcode used by two products, or null. One code must mean one
// product, or a scan would silently bill whichever came first.
export const duplicateBarcode = (products) => {
  const seen = new Set();
  for (const p of products || []) {
    const key = barcodeKey(p.barcode);
    if (!key) continue;
    if (seen.has(key)) return cleanBarcode(p.barcode);
    seen.add(key);
  }
  return null;
};

// Invoice lines after a scan. A product already on the invoice gets one more;
// otherwise it fills `rowId` (the row the code was typed into), else the first
// blank row, else a new row. Never leaves a blank row behind, because blank
// rows are kept on the invoice.
// A row nothing has been put in yet: the empty line kept ready under the
// items. Never printed or saved.
export const isBlankLine = (i) => !!i && !i.isCharge && !i.productId
  && !String(i.name || '').trim() && !(Number(i.rate) > 0) && !String(i.description || '').trim();

export const addScannedLine = (items, line, newId, rowId = null) => {
  const same = items.find((i) => i.productId === line.productId && i.id !== rowId && !i.isCharge);
  if (same) {
    return items
      .filter((i) => i.id !== rowId)
      .map((i) => (i.id === same.id ? { ...i, quantity: (Number(i.quantity) || 0) + 1 } : i));
  }
  const blank = rowId ?? items.find((i) => !String(i.name || '').trim() && !i.productId && !i.isCharge)?.id;
  if (blank != null) return items.map((i) => (i.id === blank ? { ...i, ...line, quantity: 1, isCharge: false } : i));
  return [...items, { id: newId, quantity: 1, discount: 0, cessPercent: 0, ...line }];
};

// Invoice lines after a product is picked from the suggestions in row `rowId`.
// A product already on another line is not added twice: that line gets this
// row's quantity (1 if none) added to it and this row goes. Otherwise the
// row becomes the product.
export const pickProductLine = (items, rowId, line) => {
  const row = items.find((i) => i.id === rowId);
  const same = items.find((i) => i.id !== rowId && !i.isCharge && line.productId && i.productId === line.productId);
  if (same) {
    const add = Number(row?.quantity) || 1;
    return items
      .filter((i) => i.id !== rowId)
      .map((i) => (i.id === same.id ? { ...i, quantity: (Number(i.quantity) || 0) + add } : i));
  }
  return items.map((i) => (i.id === rowId ? { ...i, ...line, unit: line.unit || i.unit || 'Nos', isCharge: false } : i));
};

// One edited row of the bulk-edit grid -> the product to save, or { error }.
// Same rules as the single product form: a name is required, GST % 0-100,
// and the selling price is mirrored to `rate` for older readers.
export const bulkRowToProduct = (product, edits) => {
  const merged = { ...product, ...edits };
  const name = String(merged.name ?? '').trim();
  if (!name) return { error: 'a product needs a name' };
  const gst = num(merged.taxPercent);
  if (!Number.isFinite(gst) || gst < 0 || gst > 100) return { error: `${name}: GST % must be 0 to 100` };
  for (const k of ['purchasePrice', 'sellingPrice', 'stock']) {
    if (!Number.isFinite(num(merged[k]))) return { error: `${name}: ${k === 'stock' ? 'stock' : 'price'} must be a number` };
  }
  const sellingPrice = num(edits.sellingPrice ?? product.sellingPrice ?? product.rate);
  // #121 - a service keeps no stock; a blank stock stays "not tracked" (it
  // used to become 0, so editing a price made it "Out of Stock").
  const blank = merged.stock === '' || merged.stock === null || merged.stock === undefined;
  return {
    product: {
      ...product,
      name,
      hsn: String(merged.hsn ?? '').trim(),
      barcode: cleanBarcode(merged.barcode),
      purchasePrice: num(merged.purchasePrice),
      sellingPrice,
      rate: sellingPrice,
      taxPercent: gst,
      unit: merged.unit || 'Nos',
      stock: isServiceProduct(merged) || blank ? undefined : num(merged.stock),
    },
  };
};

// Closing stock of each product at the end of a day (YYYY-MM-DD), worked
// back from today's stock: take off what purchases dated after it brought in,
// and add back what invoices dated after it took out (each invoice's own
// stock record, see appliedStock). Stock typed in by hand on the Products
// screen has no date, so it counts as if it happened today.
// v1.10.83 (#115) - production entries dated after it are undone the same
// way, from each entry's own stock record (raw materials back, made goods out).
// v1.10.83 (#121) - services have no stock and are left out.
// Returns Map(productId -> quantity).
export const closingStock = (products, bills, purchases, asOf, productions = []) => {
  const qty = new Map((products || []).filter((p) => !isServiceProduct(p)).map((p) => [p.id, Number(p.stock) || 0]));
  const byName = new Map((products || []).map((p) => [String(p.name || '').trim().toLowerCase(), p.id]));
  for (const pur of purchases || []) {
    if (!pur?.date || pur.date <= asOf) continue;
    for (const it of pur.items || []) {
      const id = it.productId || byName.get(String(it.name || '').trim().toLowerCase());
      if (id && qty.has(id)) qty.set(id, qty.get(id) - (Number(it.quantity) || 0));
    }
  }
  for (const b of bills || []) {
    if (!b?.invoiceDate || b.invoiceDate <= asOf || isCancelledBill(b)) continue;
    for (const [id, change] of Object.entries(appliedStock(b))) {
      if (qty.has(id)) qty.set(id, qty.get(id) - change);
    }
  }
  for (const pr of productions || []) {
    if (!pr?.date || pr.date <= asOf) continue;
    for (const [id, change] of Object.entries(pr.stockApplied || {})) {
      if (qty.has(id)) qty.set(id, qty.get(id) - (Number(change) || 0));
    }
  }
  for (const [id, q] of qty) qty.set(id, Math.round(q * 1000) / 1000);
  return qty;
};

// Value of a quantity at the product's purchase price (cost), or at its
// selling price when no purchase price is known.
export const stockValueOf = (product, quantity) => {
  const cost = Number(product?.purchasePrice) || 0;
  const price = cost > 0 ? cost : (Number(product?.sellingPrice) || Number(product?.rate) || 0);
  return { price, value: Math.round(price * (Number(quantity) || 0) * 100) / 100, atCost: cost > 0 };
};
