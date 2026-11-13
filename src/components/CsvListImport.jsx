// v1.10.83 (#121) - the Import window of Products and Clients: download a
// sample file, choose your file, see what will be added, import. Parsing is
// in src/utils/listCsv.js. Old invoices are imported elsewhere (Dashboard ->
// CSV import / export), so this window says where.
// 1.0.6: an Excel file (.xls / .xlsx) works too, as exported by MARG, Tally,
// Busy or Vyapar (src/utils/sheetRead.js), and products get a check before
// importing: GST for the ones at 0%, stock below zero.
import { useState } from 'react';
import { readSheet } from '../utils/sheetRead';
import { Upload, Download, X } from 'lucide-react';
import { toast } from './Toast';
import HelpButton from './HelpButton';

const download = (text, name) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const GST_CHOICES = [5, 12, 18, 28, 3, 0.25];

// what: 'products' | 'clients'. parse(textOrRows) -> { list, updates, skipped, errors, notes }.
// updates: saved records the file adds to (products: more barcodes), saved as they are.
// save(item) saves one. intro: what the columns are.
export default function CsvListImport({ what, sample, sampleName, doc, intro, parse, save, onClose, onDone }) {
  const [plan, setPlan] = useState(null); // { fileName, list, skipped, errors, notes }
  const [busy, setBusy] = useState(false);
  const [zeroGst, setZeroGst] = useState('keep'); // 'keep' or the GST % for products at 0%
  const [stockToZero, setStockToZero] = useState(true);

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const isText = /\.(csv|txt|tsv)$/i.test(file.name);
      const input = isText ? await file.text() : readSheet(new Uint8Array(await file.arrayBuffer()));
      const result = parse(input);
      if (!result.list.length && !result.skipped && !result.errors.length) {
        toast(`No ${what} found in ${file.name}. The file needs a heading row with a Name column.`, 'error', 9000);
        return;
      }
      setZeroGst('keep');
      setStockToZero(true);
      setPlan({ fileName: file.name, notes: {}, ...result, updates: result.updates || [] });
    } catch (err) {
      toast(`Could not read ${file.name}: ${err.message}`, 'error');
    }
  };

  const runImport = async () => {
    setBusy(true);
    let saved = 0;
    try {
      const gst = zeroGst === 'keep' ? null : Number(zeroGst);
      for (const raw of plan.list) {
        let item = raw;
        if (what === 'products' && raw.kind !== 'service') {
          if (gst !== null && !raw.taxPercent) item = { ...item, taxPercent: gst };
          if (stockToZero && raw.stock < 0) item = { ...item, stock: 0 };
        }
        await save(item);
        saved += 1;
      }
      for (const item of plan.updates) { await save(item); saved += 1; }
      const added = saved - plan.updates.length;
      toast(plan.updates.length
        ? `Imported ${added} new ${what}; added barcodes to ${plan.updates.length} already in your list`
        : `Imported ${added} ${what}${plan.skipped ? `, skipped ${plan.skipped} already in your list` : ''}`, 'success');
      onDone();
    } catch (err) {
      toast(`Import stopped after ${saved}: ${err.message}`, 'error', 9000);
      if (saved) onDone(); else setBusy(false);
    }
  };

  const close = () => { if (!busy) onClose(); };
  const n = (plan?.list.length || 0) + (plan?.updates?.length || 0);
  const notes = plan?.notes || {};
  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-content" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-title" style={{ margin: 0, textTransform: 'none' }}>Import {what} from Excel or CSV <HelpButton title={`Importing ${what}`} doc={doc} size={16} /></h3>
          <button type="button" className="icon-btn" onClick={close} title="Close" aria-label="Close"><X size={16} /></button>
        </div>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>{intro} Names already in your list are skipped, so importing the same file twice is safe.</p>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>
          <b>Moving from MARG, Tally, Busy or Vyapar?</b> Export the {what === 'products' ? 'item / stock list' : 'party / ledger list'} from it to Excel and choose that file here as it is: the columns are found by their headings.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => download(sample, sampleName)}
            title="A CSV with the right column headings and two example rows. Open it in Excel or Google Sheets, replace the examples and save as CSV.">
            <Download size={15} /> Download sample file
          </button>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            <Upload size={15} /> Choose file (Excel or CSV)
            <input type="file" accept=".xls,.xlsx,.csv,.txt,.tsv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={pickFile} style={{ display: 'none' }} />
          </label>
        </div>
        {plan && (
          <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.85rem' }}>
            <strong>{plan.fileName}</strong>: {plan.list.length} new {what} ready to import
            {plan.skipped > 0 && <> · {plan.skipped} already in your list{plan.updates.length ? '' : ' (skipped)'}</>}
            {plan.updates.length > 0 && (
              <p style={{ margin: '0.5rem 0 0' }}><b style={{ color: 'var(--success, #15803d)' }}>{notes.barcodesAdded} barcode{notes.barcodesAdded === 1 ? '' : 's'}</b> will be added to {plan.updates.length} product{plan.updates.length === 1 ? '' : 's'} already in your list (their stock and prices are not changed). Scanning any of them bills that product.</p>
            )}
            {notes.suppliers > 0 && <p style={{ margin: '0.5rem 0 0' }}>{notes.suppliers} suppliers, banks and other ledgers left out: only customers are added as clients.</p>}
            {notes.merged > 0 && <p style={{ margin: '0.5rem 0 0' }}>{notes.merged} more row{notes.merged === 1 ? '' : 's'} of an item already in the file (another batch): {notes.merged === 1 ? 'its' : 'their'} stock is added to that item.</p>}
            {notes.fromMrp > 0 && <p style={{ margin: '0.5rem 0 0' }}>{notes.fromMrp} product{notes.fromMrp === 1 ? '' : 's'} had no selling rate: the <b>MRP</b> is used as the selling price.</p>}
            {notes.zeroGst > 0 && (
              <div style={{ margin: '0.5rem 0 0', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span><b style={{ color: 'var(--warning, #b45309)' }}>{notes.zeroGst} product{notes.zeroGst === 1 ? ' is' : 's are'} at 0% GST.</b> Set their GST:</span>
                <select className="filter-select" value={zeroGst} onChange={(e) => setZeroGst(e.target.value)} aria-label="GST for products at 0%">
                  <option value="keep">Keep 0% (exempt goods)</option>
                  {GST_CHOICES.map((g) => <option key={g} value={g}>{g}%</option>)}
                </select>
              </div>
            )}
            {notes.zeroGst > 0 && zeroGst === 'keep' && (
              <p className="text-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>Most goods carry GST (clothes and footwear up to ₹2,500: 5%). You can also change it later per product.</p>
            )}
            {notes.negativeStock > 0 && (
              <label style={{ margin: '0.5rem 0 0', display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={stockToZero} onChange={(e) => setStockToZero(e.target.checked)} />
                <span>{notes.negativeStock} product{notes.negativeStock === 1 ? ' has' : 's have'} stock below zero: start {notes.negativeStock === 1 ? 'it' : 'them'} at 0 (count and correct later)</span>
              </label>
            )}
            {plan.errors.length > 0 && (
              <>
                <p style={{ color: 'var(--danger)', margin: '0.5rem 0 0.25rem' }}>{plan.errors.length} row{plan.errors.length === 1 ? '' : 's'} with a problem (not imported; fix the file and choose it again):</p>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', maxHeight: 150, overflowY: 'auto' }}>
                  {plan.errors.slice(0, 50).map((e) => <li key={e}>{e}</li>)}
                </ul>
              </>
            )}
          </div>
        )}
        <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0.75rem 0 0' }}>
          Old invoices? Import them on the Dashboard with <b>CSV import / export</b>, which has its own template.
          <HelpButton title="Importing old invoices" doc="dashboard#csv" size={14} />
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={close} disabled={busy}>Close</button>
          <button type="button" className="btn btn-primary" onClick={runImport} disabled={busy || !n}>
            {busy ? 'Importing…' : `Import ${n || ''}`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}
