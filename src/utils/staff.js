/*
 * Staff: who works for the business, and the commission each one earns on
 * the sales they attended.
 *
 * The list lives in meta.json as `staff` (so backups carry it):
 * [{ id, name, phone, role, joined, commission, active, business }].
 * `commission` is a percentage of the sale before GST. `business` is
 * businessKeyOf() of the business they work for; a person with none shows
 * under every business (the cost-centre rule).
 *
 * The link to sales is the invoice's "Attended By" box
 * (data.details.attendedBy): an invoice belongs to the staff member whose
 * name matches it, ignoring capitals and extra spaces. Renaming someone
 * keeps their old invoices only if the invoices are renamed too, so the
 * profile is the place to fix a spelling, not the invoices.
 */
import { salesSign, businessKeyOf } from '../utils.js';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const nameKey = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

export const attendedByOf = (bill) => bill?.data?.details?.attendedBy || '';

// This business's staff (plus anyone filed under no business).
export const staffForBusiness = (all, profile) => {
  const key = businessKeyOf(profile);
  return (all || []).filter((s) => !s.business || !key || s.business === key);
};

// A business saved under a new GSTIN or name keeps its staff.
export const rekeyStaff = (all, from, to) =>
  (all || []).map((s) => (from && to && s.business === from ? { ...s, business: to } : s));

// Why a staff record cannot be saved, or ''.
export function validateStaff(person, all) {
  const name = String(person?.name || '').trim();
  if (!name) return 'Enter a name.';
  const pct = Number(person.commission);
  if (person.commission !== '' && person.commission != null && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
    return 'Commission must be from 0 to 100%.';
  }
  const clash = (all || []).find((s) => s.id !== person.id && nameKey(s.name) === nameKey(name)
    && (!s.business || !person.business || s.business === person.business));
  if (clash) return `${clash.name} is already on the list. Use a different name, so invoices go to the right person.`;
  return '';
}

/**
 * Sales and commission per staff member, for invoice dates from..to
 * (YYYY-MM-DD, both included; empty = open-ended). Pass one business's bills.
 *
 * Sales follow the Profit & Loss rule: tax invoices, bills of supply and
 * composition bills count; credit notes take away; quotations, challans and
 * cancelled documents count for nothing. "Sales" is the value before GST and
 * TCS, the usual base for a commission.
 *
 * Returns { rows, unmatched }: a row per staff member (with their invoices,
 * newest first) and the invoices whose Attended By names no one on the list.
 */
export function staffReport({ bills = [], staff = [], from = '', to = '' }) {
  const byKey = new Map(staff.map((s) => [nameKey(s.name), s]));
  const rows = new Map(staff.map((s) => [s.id, { staff: s, sales: 0, commission: 0, invoices: [], clients: new Set() }]));
  const unmatched = [];
  for (const b of bills) {
    const sign = salesSign(b);
    if (!sign) continue;
    const date = b.invoiceDate || b.data?.details?.invoiceDate || '';
    if ((from && date < from) || (to && date > to)) continue;
    const who = attendedByOf(b);
    if (!nameKey(who)) continue;
    const t = b.data?.totals || {};
    const total = Number(b.totalAmount ?? t.total) || 0;
    const tax = (Number(b.totalTaxAmount ?? t.totalTaxAmount) || 0) + (Number(t.tcsAmount) || 0);
    const sale = sign * (total - tax);
    const s = byKey.get(nameKey(who));
    const line = { id: b.id, number: b.invoiceNumber, date, client: b.clientName || b.data?.client?.name || '', type: b.invoiceType, sale: r2(sale) };
    if (!s) { unmatched.push({ ...line, attendedBy: who }); continue; }
    const row = rows.get(s.id);
    const pct = Number(s.commission) || 0;
    line.commission = r2(sale * pct / 100);
    row.sales += sale;
    row.commission += line.commission;
    row.invoices.push(line);
    if (line.client) row.clients.add(nameKey(line.client));
  }
  const out = [...rows.values()].map((r) => ({
    staff: r.staff,
    sales: r2(r.sales),
    commission: r2(r.commission),
    count: r.invoices.length,
    clients: r.clients.size,
    invoices: r.invoices.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
  }));
  return { rows: out, unmatched };
}
