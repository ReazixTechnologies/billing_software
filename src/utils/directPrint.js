// Direct printing: send the invoice PDF to the printer saved in
// Settings › Print & PDF, with no print dialog. The local server hands it to
// the operating system's print queue (see /api/print in server.js).
import { getPrintSettings } from './printSettings';

// The printer to use without a dialog, or '' when direct printing is off.
export function getDirectPrinter() {
  const s = getPrintSettings();
  return s.directPrintEnabled && s.directPrinterName ? String(s.directPrinterName) : '';
}

export async function listPrinters() {
  const r = await fetch('/api/printers');
  if (!r.ok) throw new Error(`printers ${r.status}`);
  return r.json(); // { ok, printers: [{ name, isDefault }], platform }
}

// Resolves on success; throws an Error whose message can be shown as is.
export async function printPdfDirect(pdfBlob, printer, copies = 1) {
  const params = new URLSearchParams({ printer, copies: String(copies) });
  let r;
  try {
    r = await fetch(`/api/print?${params}`, { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: pdfBlob });
  } catch {
    throw new Error('Could not reach the app to print. Is it still running?');
  }
  let body = null;
  try { body = await r.json(); } catch { /* not JSON */ }
  if (!r.ok || !body?.ok) throw new Error(body?.message || 'The printer did not accept the invoice. Check that it is on and connected.');
}
