// Paid / Unpaid and the payment mode chosen on the invoice form, and the
// empty row kept ready under the line items.
//
// Run: `node scripts/invoice-payment-test.mjs`

import { applyFormPayment, newPaymentInfo, paymentInfoForBill, splitFormPayment } from '../src/utils/invoicePayment.js';
import { isBlankLine } from '../src/utils/products.js';
import { paymentStatusFor } from '../src/utils.js';

let passed = 0, failed = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label}\n     expected: ${b}\n     actual:   ${a}`); }
}
const info = (patch) => ({ ...newPaymentInfo('paid'), idBase: 'abc123xyz', ...patch });
const modes = (list) => list.map((p) => [p.mode, p.amount]);
const opts = { due: 1000, date: '2026-11-07', now: 'T' };

console.log('\nSplitting the amount');
eq(splitFormPayment(info({ mode: 'upi' }), 1000), [{ mode: 'upi', amount: 1000 }], 'UPI takes it all');
eq(splitFormPayment(info({ mode: 'cash' }), 1000), [{ mode: 'cash', amount: 1000 }], 'cash takes it all');
eq(splitFormPayment(info({ mode: 'bank-transfer' }), 1000), [{ mode: 'bank-transfer', amount: 1000 }], 'bank takes it all');
eq(splitFormPayment(info({ mode: 'upi-cash', cash: 300 }), 1000), [{ mode: 'cash', amount: 300 }, { mode: 'upi', amount: 700 }], 'UPI + Cash: cash typed, UPI is the rest');
eq(splitFormPayment(info({ mode: 'upi-cash', lead: 'upi', upi: 250.5 }), 1000), [{ mode: 'cash', amount: 749.5 }, { mode: 'upi', amount: 250.5 }], 'UPI + Cash: UPI typed, cash is the rest');
eq(splitFormPayment(info({ mode: 'upi-cash', cash: 5000 }), 1000), [{ mode: 'cash', amount: 1000 }], 'cash above the amount is capped');
eq(splitFormPayment(info({ mode: 'upi-cash', cash: -20 }), 1000), [{ mode: 'upi', amount: 1000 }], 'negative cash counts as none');
eq(splitFormPayment(info({ mode: 'upi-cash', cash: '' }), 1000), [{ mode: 'upi', amount: 1000 }], 'no cash typed: all UPI');
eq(splitFormPayment(info({ mode: 'upi-cash', cash: 333.33 }), 999.99).reduce((s, e) => s + e.amount, 0), 999.99, 'the parts add up to the paisa');
eq(splitFormPayment(info({ status: 'unpaid' }), 1000), [], 'unpaid: nothing');
eq(splitFormPayment(info({}), 0), [], 'nothing to collect: nothing');

console.log('\nPayments on the bill');
const paid = applyFormPayment([], info({ mode: 'upi-cash', cash: 400 }), opts);
eq(modes(paid), [['cash', 400], ['upi', 600]], 'two entries: cash and UPI');
eq(paid.map((p) => p.receiptNo), ['RCPT-ABC123XYZC', 'RCPT-ABC123XYZU'], 'each has its own receipt number');
eq(paymentStatusFor({ totalAmount: 1000 }, paid.reduce((s, p) => s + p.amount, 0)), 'paid', 'the bill is paid');
eq(modes(applyFormPayment(paid, info({ mode: 'upi-cash', cash: 400 }), { ...opts, due: 1200 })), [['cash', 400], ['upi', 800]], 'total changed: re-split, not added again');
eq(applyFormPayment(paid, info({ mode: 'upi-cash', cash: 400 }), { ...opts, now: 'LATER' })[0].recordedAt, 'T', 'a re-save keeps when it was recorded');
eq(applyFormPayment(paid, info({ status: 'unpaid' }), opts), [], 'marked unpaid: the form payments go');
const dashboard = { id: 'pay_dash', amount: 300, mode: 'cheque', date: '2026-11-01' };
eq(modes(applyFormPayment([dashboard, ...paid], info({ mode: 'cash' }), opts)), [['cheque', 300], ['cash', 700]], 'a Dashboard payment is kept and counted first');
eq(modes(applyFormPayment([dashboard], info({ status: 'unpaid' }), opts)), [['cheque', 300]], 'unpaid never removes a Dashboard payment');
eq(modes(applyFormPayment([{ ...dashboard, amount: 1000 }], info({ mode: 'upi' }), opts)), [['cheque', 1000]], 'already paid elsewhere: nothing added');

console.log('\nOpening a saved bill');
eq(paymentInfoForBill({ data: { paymentInfo: info({ mode: 'cash' }) } }).mode, 'cash', 'its saved choice');
eq(paymentInfoForBill({ status: 'paid', payments: [{ mode: 'upi', amount: 5 }] }).status, 'paid', 'an older paid bill shows Paid');
eq(paymentInfoForBill({ status: 'unpaid' }).status, 'unpaid', 'an older unpaid bill shows Unpaid');

console.log('\nThe empty row');
eq(isBlankLine({ id: 1, name: '', quantity: 1, rate: 0, taxPercent: 18 }), true, 'a fresh row is blank');
eq(isBlankLine({ id: 1, name: 'Pen', rate: 0 }), false, 'a typed name is an item');
eq(isBlankLine({ id: 1, name: '', rate: 50 }), false, 'a rate is an item');
eq(isBlankLine({ id: 1, name: '', productId: 'p1' }), false, 'a product is an item');
eq(isBlankLine({ id: 1, name: '', isCharge: true }), false, 'the delivery line is not blank');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
