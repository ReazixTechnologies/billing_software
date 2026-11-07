// Barcode scanning: finding a product by its code, and what a scan does to the
// invoice lines. USB and Bluetooth scanners type the code like a keyboard.
//
// Run: `node scripts/barcode-test.mjs`

import { addScannedLine, bulkRowToProduct, pickProductLine, cleanBarcode, duplicateBarcode, findByBarcode } from '../src/utils/products.js';
import { productsCsvToList, PRODUCTS_SAMPLE } from '../src/utils/listCsv.js';

let passed = 0, failed = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label}\n     expected: ${b}\n     actual:   ${a}`); }
}

const pen = { id: 'p1', name: 'Pen', barcode: '0890123456789' };
const ink = { id: 'p2', name: 'Ink', barcode: 'INK-77' };
const pad = { id: 'p3', name: 'Pad' };

console.log('\nFinding a product');
eq(findByBarcode([pen, ink, pad], '0890123456789')?.id, 'p1', 'exact code');
eq(findByBarcode([pen, ink, pad], ' ink-77 ')?.id, 'p2', 'case and outer spaces ignored');
eq(findByBarcode([pen, ink, pad], '890123456789'), null, 'a leading zero counts');
eq(findByBarcode([pen, ink, pad], '089012'), null, 'part of a code is not a match');
eq(findByBarcode([pen, ink, pad], ''), null, 'empty never matches a product with no barcode');
eq(cleanBarcode(undefined), '', 'a missing barcode is empty');

console.log('\nOne code, one product');
eq(duplicateBarcode([pen, ink, pad, { id: 'p4' }]), null, 'blank barcodes do not clash');
eq(duplicateBarcode([pen, { id: 'p4', barcode: ' ink-77' }, ink]), 'INK-77', 'a repeat is found, ignoring case');

console.log('\nWhat a scan does to the lines');
const line = { name: 'Pen', hsn: '9608', rate: 10, unit: 'Nos', taxPercent: 18, productId: 'p1' };
const blank = { id: 'a', name: '', quantity: 1, rate: 0, discount: 0 };
let r = addScannedLine([blank], line, 'new');
eq([r.length, r[0].id, r[0].name, r[0].quantity], [1, 'a', 'Pen', 1], 'first scan fills the blank row');
r = addScannedLine(r, line, 'new');
eq([r.length, r[0].quantity], [1, 2], 'same product again: one more, no new row');
r = addScannedLine([{ id: 'a', name: 'Pen', productId: 'p1', quantity: '2' }], line, 'new');
eq(r[0].quantity, 3, 'a quantity typed as text still adds up');
r = addScannedLine([{ id: 'a', name: 'Ink', productId: 'p2', quantity: 1 }], line, 'new');
eq([r.length, r[1].id, r[1].productId, r[1].quantity, r[1].discount, r[1].cessPercent], [2, 'new', 'p1', 1, 0, 0], 'a different product gets a new row');
r = addScannedLine([{ id: 'a', name: 'Pen', productId: 'p1', quantity: 1 }, { id: 'b', name: '0890123456789', quantity: 1 }], line, 'new', 'b');
eq([r.length, r[0].quantity], [1, 2], 'scanned into another row: that row goes, the first gets one more');
r = addScannedLine([{ id: 'a', name: '0890123456789', quantity: 1 }], line, 'new', 'a');
eq([r.length, r[0].name, r[0].productId], [1, 'Pen', 'p1'], 'scanned into its own row: the code becomes the product');
r = addScannedLine([{ id: 'c', name: 'Delivery charges', isCharge: true, quantity: 1 }], line, 'new');
eq([r.length, r[0].isCharge, r[1].name], [2, true, 'Pen'], 'the delivery line is never overwritten');

console.log('\nPicking a product from the suggestions');
r = pickProductLine([{ id: 'a', name: 'Pe', quantity: 1, unit: 'Nos' }], 'a', line);
eq([r.length, r[0].name, r[0].productId], [1, 'Pen', 'p1'], 'first pick fills its row');
r = pickProductLine([{ id: 'a', name: 'Pen', productId: 'p1', quantity: 2 }, { id: 'b', name: 'pe', quantity: 1 }], 'b', line);
eq([r.length, r[0].id, r[0].quantity], [1, 'a', 3], 'same product again: added to the first line, no new row');
r = pickProductLine([{ id: 'a', name: 'Pen', productId: 'p1', quantity: '1' }, { id: 'b', name: 'pe', quantity: 4 }], 'b', line);
eq([r.length, r[0].quantity], [1, 5], 'the quantity typed on the new row is added');
r = pickProductLine([{ id: 'a', name: 'Pen', productId: 'p1', quantity: 1 }], 'a', line);
eq([r.length, r[0].quantity], [1, 1], 'picking again on its own row does not double it');
r = pickProductLine([{ id: 'a', name: 'Ink', productId: 'p2', quantity: 1 }, { id: 'b', name: 'pe', quantity: 1 }], 'b', line);
eq([r.length, r[1].productId], [2, 'p1'], 'a different product keeps its own row');

console.log('\nBulk edit');
eq(bulkRowToProduct({ id: 'p1', name: 'Pen' }, { barcode: ' 123 ' }).product.barcode, '123', 'barcode saved, trimmed');

console.log('\nCSV import');
const csv = (rows) => ['Name,Barcode', ...rows].join('\n');
eq(productsCsvToList(csv(['Pen,0890123456789'])).products[0].barcode, '0890123456789', 'leading zero kept');
eq(productsCsvToList(csv(['Pen,'])).products[0].barcode, undefined, 'blank barcode is left out');
eq(productsCsvToList('Name,EAN\nPen,123').products[0].barcode, '123', 'EAN heading understood');
let c = productsCsvToList(csv(['Pen,8.90123E+12']));
eq([c.products.length, /Excel/.test(c.errors[0])], [0, true], 'number mangled by Excel is refused');
c = productsCsvToList(csv(['Pen,111', 'Ink,111']));
eq([c.products.length, /already used/.test(c.errors[0])], [1, true], 'a repeat inside the file is refused');
c = productsCsvToList(csv(['Ink,INK-77']), [{ ...pen, name: 'Old' }, { ...ink, name: 'Other' }]);
eq([c.products.length, c.errors.length], [0, 1], 'a code already saved is refused');
c = productsCsvToList(csv(['Pen,0890123456789']), [pen]);
eq([c.skipped, c.errors.length], [1, 0], 'importing the same file twice stays safe');
eq(productsCsvToList(PRODUCTS_SAMPLE).products[0].barcode, '8900000000017', 'the sample file imports its barcode');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
