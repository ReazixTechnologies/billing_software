// Read a spreadsheet the user chose into rows of cells (the first sheet).
// Written here rather than with a spreadsheet library (as utils/xlsx.js
// writes .xlsx): MARG, Tally, Busy and the rest export one of
//   - .xls  : old Excel (BIFF8 inside an OLE2 compound file)  — MARG's "Excel"
//   - .xlsx : new Excel (a zip of XML; fflate unzips it)
//   - .xls / .htm that is really an HTML table (several Indian packages)
//   - .csv, or tab-separated .txt
// Only cell values are read: no formulas run, no macros, nothing fetched.
// Every offset is bounds-checked, so a damaged or hostile file is refused
// with an error instead of hanging or reading past the end.
import { unzipSync, strFromU8 } from 'fflate';
import { parseCsv } from './bulkCsv.js';

const MAX_BYTES = 40 * 1024 * 1024;

const fail = (msg) => { throw new Error(msg); };

// ---------------------------------------------------------------------------
// OLE2 compound file: find the "Workbook" (or old "Book") stream.
// ---------------------------------------------------------------------------
function cfbStream(u8, wanted) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const secSize = 1 << dv.getUint16(0x1E, true);
  const miniSize = 1 << dv.getUint16(0x20, true);
  if (secSize !== 512 && secSize !== 4096) fail('The Excel file is damaged (sector size).');
  const nFat = dv.getUint32(0x2C, true);
  const dirStart = dv.getUint32(0x30, true);
  const miniCutoff = dv.getUint32(0x38, true);
  const miniFatStart = dv.getUint32(0x3C, true);
  let difatSec = dv.getUint32(0x44, true);
  const maxSec = Math.floor((u8.length - 512) / secSize);
  const secOff = (s) => {
    if (s >= maxSec) fail('The Excel file is damaged or cut short.');
    return 512 + s * secSize;
  };

  // The FAT's own sectors: 109 listed in the header, the rest in DIFAT sectors.
  const fatSecs = [];
  for (let i = 0; i < 109 && fatSecs.length < nFat; i++) fatSecs.push(dv.getUint32(0x4C + i * 4, true));
  for (let guard = 0; fatSecs.length < nFat && difatSec < 0xFFFFFFFA; guard++) {
    if (guard > maxSec) fail('The Excel file is damaged (DIFAT loop).');
    const o = secOff(difatSec);
    for (let i = 0; i < secSize / 4 - 1 && fatSecs.length < nFat; i++) fatSecs.push(dv.getUint32(o + i * 4, true));
    difatSec = dv.getUint32(o + secSize - 4, true);
  }
  const fat = new Uint32Array(fatSecs.length * (secSize / 4));
  fatSecs.forEach((s, i) => { const o = secOff(s); for (let j = 0; j < secSize / 4; j++) fat[i * (secSize / 4) + j] = dv.getUint32(o + j * 4, true); });

  const chain = (start, table, limit) => {
    const out = [];
    for (let s = start; s < 0xFFFFFFFA; s = table[s]) {
      if (s >= table.length || out.length > limit) fail('The Excel file is damaged (sector chain).');
      out.push(s);
    }
    return out;
  };
  const readChain = (start) => {
    const secs = chain(start, fat, maxSec);
    const out = new Uint8Array(secs.length * secSize);
    secs.forEach((s, i) => { const o = secOff(s); out.set(u8.subarray(o, o + secSize), i * secSize); });
    return out;
  };

  const dir = readChain(dirStart);
  const ddv = new DataView(dir.buffer);
  let root = null;
  let found = null;
  for (let o = 0; o + 128 <= dir.length; o += 128) {
    const nameLen = ddv.getUint16(o + 0x40, true);
    const type = dir[o + 0x42];
    if (!type || nameLen < 2 || nameLen > 64) continue;
    let name = '';
    for (let i = 0; i < nameLen / 2 - 1; i++) name += String.fromCharCode(ddv.getUint16(o + i * 2, true));
    const entry = { type, start: ddv.getUint32(o + 0x74, true), size: ddv.getUint32(o + 0x78, true) };
    if (type === 5) root = entry;
    else if (type === 2 && !found && wanted.includes(name)) found = entry;
  }
  if (!found) return null;

  if (found.size >= miniCutoff) return readChain(found.start).subarray(0, found.size);
  // A small stream lives in the mini stream (the root entry's data).
  if (!root) fail('The Excel file is damaged (no root).');
  const mini = readChain(root.start);
  const mfRaw = readChain(miniFatStart);
  const miniFat = new Uint32Array(mfRaw.length / 4);
  const mdv = new DataView(mfRaw.buffer);
  for (let i = 0; i < miniFat.length; i++) miniFat[i] = mdv.getUint32(i * 4, true);
  const secs = chain(found.start, miniFat, mini.length / miniSize);
  const out = new Uint8Array(secs.length * miniSize);
  secs.forEach((s, i) => {
    if ((s + 1) * miniSize > mini.length) fail('The Excel file is damaged (mini stream).');
    out.set(mini.subarray(s * miniSize, (s + 1) * miniSize), i * miniSize);
  });
  return out.subarray(0, found.size);
}

// ---------------------------------------------------------------------------
// BIFF8 (Excel 97-2003) records -> rows.
// ---------------------------------------------------------------------------
const latin1 = (u8, o, n) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(u8[o + i]); return s; };
const utf16 = (u8, o, n) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(u8[o + i * 2] | (u8[o + i * 2 + 1] << 8)); return s; };

function rkValue(rk) {
  let v;
  if (rk & 2) v = rk >> 2; // 30-bit signed integer
  else {
    const b = new DataView(new ArrayBuffer(8));
    b.setUint32(4, rk & 0xFFFFFFFC, true);
    v = b.getFloat64(0, true);
  }
  return rk & 1 ? v / 100 : v;
}

// The SST (shared strings) may run on into CONTINUE records; a string's
// characters that cross into one start with a fresh "high byte" flag.
function readSst(segs) {
  let si = 0;
  let pos = 8; // skip total and unique counts
  const strings = [];
  const need = () => {
    while (si < segs.length && pos >= segs[si].length) { si++; pos = 0; }
    if (si >= segs.length) fail('The Excel file is damaged (strings).');
    return segs[si];
  };
  const u8at = () => { const s = need(); return s[pos++]; };
  const u16at = () => u8at() | (u8at() << 8);
  const u32at = () => (u16at() | (u16at() << 16)) >>> 0;
  const skip = (n) => { while (n > 0) { const s = need(); const k = Math.min(n, s.length - pos); pos += k; n -= k; } };
  const unique = segs[0].length >= 8 ? new DataView(segs[0].buffer, segs[0].byteOffset).getUint32(4, true) : 0;
  for (let k = 0; k < unique; k++) {
    if (si >= segs.length || (si === segs.length - 1 && pos >= segs[si].length)) break;
    let cch = u16at();
    const flags = u8at();
    let high = flags & 1;
    const runs = flags & 8 ? u16at() : 0;
    const ext = flags & 4 ? u32at() : 0;
    let str = '';
    while (cch > 0) {
      if (pos >= segs[si].length) {
        // The characters go on in the next CONTINUE, which starts with a
        // fresh flag byte saying 8- or 16-bit.
        si++; pos = 0;
        if (si >= segs.length || !segs[si].length) fail('The Excel file is damaged (strings).');
        high = segs[si][pos++] & 1;
      }
      const s = segs[si];
      const n = Math.min(cch, high ? Math.floor((s.length - pos) / 2) : s.length - pos);
      if (n <= 0) { pos = s.length; continue; }
      str += high ? utf16(s, pos, n) : latin1(s, pos, n);
      pos += high ? n * 2 : n;
      cch -= n;
    }
    skip(runs * 4 + ext);
    strings.push(str);
  }
  return strings;
}

function biffRows(wb) {
  const dv = new DataView(wb.buffer, wb.byteOffset, wb.byteLength);
  const rec = (o) => (o + 4 <= wb.length ? { type: dv.getUint16(o, true), len: dv.getUint16(o + 2, true) } : null);
  const first = rec(0);
  if (!first || (first.type !== 0x0809)) fail('This .xls is an old Excel 95 file. Open it in Excel and save it as .xlsx, then choose it again.');
  if (dv.getUint16(4, true) !== 0x0600) fail('This .xls is an old Excel 95 file. Open it in Excel and save it as .xlsx, then choose it again.');

  // Workbook globals: shared strings and where each sheet starts.
  let sst = [];
  const sheets = [];
  let o = 0;
  while (o + 4 <= wb.length) {
    const r = rec(o);
    const d = o + 4;
    if (d + r.len > wb.length) fail('The Excel file is cut short.');
    if (r.type === 0x0085) sheets.push({ pos: dv.getUint32(d, true), kind: wb[d + 5] });
    else if (r.type === 0x00FC) {
      const segs = [wb.subarray(d, d + r.len)];
      let n = d + r.len;
      for (let c = rec(n); c && c.type === 0x003C; c = rec(n)) { segs.push(wb.subarray(n + 4, n + 4 + c.len)); n += 4 + c.len; }
      sst = readSst(segs);
    } else if (r.type === 0x000A) break; // end of globals
    o = d + r.len;
  }

  const sheet = sheets.find((s) => s.kind === 0) || sheets[0];
  if (!sheet) return [];
  const rows = [];
  const put = (row, col, v) => { if (row > 200000 || col > 1000) return; (rows[row] ||= [])[col] = v; };
  let pendingString = null; // a FORMULA whose text result is in the next STRING record
  for (o = sheet.pos; o + 4 <= wb.length;) {
    const r = rec(o);
    const d = o + 4;
    if (d + r.len > wb.length) break;
    const row = r.len >= 4 ? dv.getUint16(d, true) : 0;
    const col = r.len >= 4 ? dv.getUint16(d + 2, true) : 0;
    switch (r.type) {
      case 0x00FD: put(row, col, sst[dv.getUint32(d + 6, true)] ?? ''); break; // LABELSST
      case 0x0203: put(row, col, dv.getFloat64(d + 6, true)); break; // NUMBER
      case 0x027E: put(row, col, rkValue(dv.getInt32(d + 6, true))); break; // RK
      case 0x00BD: { // MULRK
        const last = dv.getUint16(d + r.len - 2, true);
        for (let c = col, p = d + 4; c <= last && p + 6 <= d + r.len - 2; c++, p += 6) put(row, c, rkValue(dv.getInt32(p + 2, true)));
        break;
      }
      case 0x0204: case 0x00D6: { // LABEL, RSTRING
        const n = dv.getUint16(d + 6, true);
        put(row, col, wb[d + 8] & 1 ? utf16(wb, d + 9, n) : latin1(wb, d + 9, n));
        break;
      }
      case 0x0006: // FORMULA: use the result Excel saved
        if (dv.getUint16(d + 12, true) === 0xFFFF) {
          const t = wb[d + 6];
          if (t === 0) pendingString = { row, col };
          else if (t === 1) put(row, col, !!wb[d + 8]);
        } else put(row, col, dv.getFloat64(d + 6, true));
        break;
      case 0x0207: // STRING (the text a formula gave)
        if (pendingString) {
          const n = dv.getUint16(d, true);
          put(pendingString.row, pendingString.col, wb[d + 2] & 1 ? utf16(wb, d + 3, n) : latin1(wb, d + 3, n));
          pendingString = null;
        }
        break;
      case 0x0205: if (!wb[d + 7]) put(row, col, !!wb[d + 6]); break; // BOOLERR (errors left blank)
      default: break;
    }
    if (r.type === 0x000A) break; // end of this sheet
    o = d + r.len;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// .xlsx: sharedStrings + the first worksheet.
// ---------------------------------------------------------------------------
const xmlText = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16) || 32))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n) || 32))
  .replace(/&amp;/g, '&');
const runsText = (xml) => [...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((m) => xmlText(m[1])).join('');
const colIndex = (ref) => { let n = 0; for (const ch of /^[A-Z]+/i.exec(ref)?.[0] || '') n = n * 26 + (ch.toUpperCase().charCodeAt(0) - 64); return n - 1; };

function xlsxRows(u8) {
  let files;
  try {
    files = unzipSync(u8, { filter: (f) => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/i.test(f.name) && f.originalSize < 200 * 1024 * 1024 });
  } catch { fail('The .xlsx file is damaged.'); }
  const get = (name) => { const k = Object.keys(files).find((f) => f.toLowerCase() === name.toLowerCase()); return k ? strFromU8(files[k]) : ''; };
  const shared = [...get('xl/sharedStrings.xml').matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((m) => runsText(m[1]));
  // The first sheet in the workbook's order.
  let path = '';
  const firstId = /<(?:\w+:)?sheet\s[^>]*r:id="([^"]+)"/.exec(get('xl/workbook.xml'))?.[1];
  if (firstId) {
    const rel = [...get('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\s[^>]*>/g)].map((m) => m[0]).find((t) => t.includes(`Id="${firstId}"`));
    const target = rel && /Target="([^"]+)"/.exec(rel)?.[1];
    if (target) path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
  }
  const xml = (path && get(path)) || get(Object.keys(files).filter((f) => /worksheets\//i.test(f)).sort()[0] || '');
  if (!xml) fail('No sheet found in the .xlsx file.');
  const rows = [];
  for (const rm of xml.matchAll(/<(?:\w+:)?row\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?row>/g)) {
    const rIdx = Number(/\br="(\d+)"/.exec(rm[1])?.[1] || rows.length + 1) - 1;
    if (rIdx > 200000) continue;
    const row = [];
    let next = 0;
    for (const cm of rm[2].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const attrs = cm[1];
      const body = cm[2] || '';
      const ref = /\br="([A-Z]+)\d*"/i.exec(attrs)?.[1];
      const c = ref ? colIndex(ref) : next;
      next = c + 1;
      if (c > 1000) continue;
      const t = /\bt="(\w+)"/.exec(attrs)?.[1] || 'n';
      const v = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(body)?.[1];
      if (t === 's') row[c] = shared[Number(v)] ?? '';
      else if (t === 'inlineStr') row[c] = runsText(body);
      else if (t === 'str' || t === 'e') row[c] = t === 'e' ? '' : xmlText(v || '');
      else if (t === 'b') row[c] = v === '1';
      else if (v !== undefined && v !== '') row[c] = Number.isFinite(Number(v)) ? Number(v) : xmlText(v);
    }
    rows[rIdx] = row;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// HTML table saved as .xls, and plain text.
// ---------------------------------------------------------------------------
function htmlRows(text) {
  const rows = [];
  for (const tr of text.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = [];
    for (const td of tr[1].matchAll(/<t([dh])\b([^>]*)>([\s\S]*?)<\/t\1>/gi)) {
      const cell = xmlText(td[3].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ')).replace(/\s+/g, ' ').trim();
      row.push(cell);
      const span = Number(/colspan="?(\d+)/i.exec(td[2])?.[1] || 1);
      for (let i = 1; i < Math.min(span, 50); i++) row.push('');
    }
    rows.push(row);
  }
  return rows;
}

function textRows(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  if (tabs > commas) return text.split(/\r?\n/).map((l) => l.split('\t'));
  return parseCsv(text);
}

// TextDecoder drops a byte-order mark by itself.
const decodeText = (u8) => {
  if (u8[0] === 0xFF && u8[1] === 0xFE) return new TextDecoder('utf-16le').decode(u8);
  const utf8 = new TextDecoder('utf-8').decode(u8);
  // Not UTF-8 (Windows-1252 from an old program): read byte for byte.
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(u8) : utf8;
};

/**
 * File bytes -> rows of cells (strings, numbers, booleans), blank rows dropped
 * and every cell turned into a trimmed string or number. Throws an Error
 * with a message a shop owner can act on.
 */
export function readSheet(input) {
  const u8 = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (u8.length > MAX_BYTES) fail('The file is too big (over 40 MB).');
  let rows;
  if (u8[0] === 0xD0 && u8[1] === 0xCF && u8[2] === 0x11 && u8[3] === 0xE0) {
    const wb = cfbStream(u8, ['Workbook', 'Book']);
    if (!wb) fail('No sheet found in the .xls file. Open it in Excel and save it as .xlsx, then choose it again.');
    rows = biffRows(wb);
  } else if (u8[0] === 0x50 && u8[1] === 0x4B) {
    rows = xlsxRows(u8);
  } else {
    const text = decodeText(u8);
    rows = /^\s*</.test(text) && /<table/i.test(text) ? htmlRows(text) : textRows(text);
  }
  const out = [];
  for (const r of rows) {
    if (!r) continue;
    const row = Array.from(r, (v) => (typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v ?? '').trim()));
    if (row.some((v) => v !== '')) out.push(row);
  }
  return out;
}
