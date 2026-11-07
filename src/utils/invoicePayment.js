// Paid / Unpaid and the payment mode chosen on the invoice form itself.
//
// The choice is kept on the bill (data.paymentInfo) and turned into real
// payment entries (bill.payments), the same shape the Dashboard's Record
// Payment writes, so the status, the outstanding report and the cash book all
// see it. The entries this form made carry source: 'invoice-form'; every save
// replaces only those, so payments recorded elsewhere (Dashboard, client
// credit) are never touched and a changed total re-splits cleanly.

export const FORM_PAYMENT_MODES = [
  ['upi', 'UPI'],
  ['cash', 'Cash'],
  ['upi-cash', 'UPI + Cash'],
  ['bank-transfer', 'Bank'],
];
export const FORM_PAYMENT_SOURCE = 'invoice-form';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
// 9 characters, so the c/u/b suffix survives the 10-character receipt number
// the Dashboard prints (RCPT-<first 10 of the id>).
const newIdBase = () => Date.now().toString(36).slice(-8) + Math.random().toString(36).slice(2, 3);

export const newPaymentInfo = (status = 'unpaid', mode = 'upi') => ({ status, mode, cash: '', upi: '', lead: 'cash', idBase: newIdBase() });

// What the form opens with for a saved bill. A bill saved before this existed
// shows Paid when its payments already cover it (nothing new is added then).
export function paymentInfoForBill(bill) {
  const saved = bill?.data?.paymentInfo;
  if (saved && saved.idBase) return { ...newPaymentInfo(), ...saved };
  const last = [...(bill?.payments || [])].reverse().find((p) => FORM_PAYMENT_MODES.some(([v]) => v === p.mode));
  return newPaymentInfo(bill?.status === 'paid' ? 'paid' : 'unpaid', last?.mode || 'upi');
}

// Splits `due` by the chosen mode. UPI + Cash: the part last typed (cash, or
// UPI when info.lead is 'upi') is taken as typed, never below 0 or above the
// amount, and the other part is the rest, so the two always add up exactly.
export function splitFormPayment(info, due) {
  const amount = r2(Math.max(0, due));
  if (!info || info.status !== 'paid' || amount <= 0.005) return [];
  if (info.mode === 'upi-cash') {
    const clamp = (v) => r2(Math.min(Math.max(0, Number(v) || 0), amount));
    const cash = info.lead === 'upi' ? r2(amount - clamp(info.upi)) : clamp(info.cash);
    const upi = r2(amount - cash);
    return [cash > 0 && { mode: 'cash', amount: cash }, upi > 0 && { mode: 'upi', amount: upi }].filter(Boolean);
  }
  const mode = FORM_PAYMENT_MODES.some(([v]) => v === info.mode) ? info.mode : 'upi';
  return [{ mode, amount }];
}

const otherPayments = (payments) => (payments || []).filter((p) => p?.source !== FORM_PAYMENT_SOURCE);
export const paidElsewhere = (payments) => r2(otherPayments(payments).reduce((s, p) => s + (Number(p.amount) || 0), 0));

// The bill's payments with this form's entries rebuilt from `info`.
// `due` is what the bill asks for (total less TDS); payments recorded
// elsewhere count first, the form covers what is left.
export function applyFormPayment(payments, info, { due, date, now = new Date().toISOString() }) {
  const others = otherPayments(payments);
  const before = new Map((payments || []).filter((p) => p?.source === FORM_PAYMENT_SOURCE).map((p) => [p.id, p]));
  const remaining = r2(Math.max(0, due - paidElsewhere(others)));
  const base = info?.idBase || newIdBase();
  const entries = splitFormPayment(info, remaining).map(({ mode, amount }) => {
    const id = `pay_${base}${mode === 'cash' ? 'c' : mode === 'upi' ? 'u' : 'b'}`;
    return {
      id, amount, date, mode,
      note: info.mode === 'upi-cash' ? 'UPI + Cash' : '',
      recordedAt: before.get(id)?.recordedAt || now,
      receiptNo: `RCPT-${id.replace('pay_', '').toUpperCase().slice(0, 10)}`,
      source: FORM_PAYMENT_SOURCE,
    };
  });
  return [...others, ...entries];
}
