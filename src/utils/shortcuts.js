// MARG-style keyboard shortcuts (requested so MARG ERP users find the keys
// they already know). Only actions this app really has are listed: a MARG key
// whose feature does not exist here (calculator, change user, counter sale,
// last deal, batch details...) is left unassigned rather than pointed at
// something else. Every key can be changed in Settings › Shortcut keys.
//
// `screen` makes a key context-dependent, as in MARG: F2 means "new" on the
// screen you are on (new product, new client, new purchase, new invoice line)
// and F11 prints only on the invoice screen. A screen-bound action works by
// pressing the button on that screen marked data-shortcut="<action>", so it
// does exactly what clicking that button does.

export const SHORTCUT_ACTIONS = [
  { id: 'newSale',      keys: 'Alt+N',   label: 'New sales invoice',                        marg: 'Alt + N  New sales bill' },
  { id: 'modifySale',   keys: 'Alt+M',   label: 'Invoice list (open a bill to modify it)',  marg: 'Alt + M  Modify sales bill' },
  { id: 'purchases',    keys: 'Alt+P',   label: 'Purchases',                                marg: 'Alt + P  Purchase bill', view: 'purchases' },
  { id: 'challan',      keys: 'Alt+C',   label: 'New delivery challan',                     marg: 'Alt + C  Sales challan' },
  { id: 'vouchers',     keys: 'Alt+V',   label: 'Receipts (payment vouchers)',              marg: 'Alt + V  Voucher entries', view: 'receipts' },
  { id: 'items',        keys: 'Ctrl+I',  label: 'Products (item list)',                     marg: 'Ctrl + I  Item master', view: 'inventory' },
  { id: 'ledgers',      keys: 'Ctrl+L',  label: 'Clients (party / ledger list)',            marg: 'Ctrl + L  Ledger list', view: 'clients' },
  { id: 'profit',       keys: 'Alt+F10', label: 'Reports (Profit & Loss)',                  marg: 'Alt + F10  Profit details', view: 'reports' },
  { id: 'new',          keys: 'F2',      label: 'New on this screen: invoice line, product, client or purchase', marg: 'F2  New item', screen: true },
  { id: 'print',        keys: 'F11',     label: 'Print the invoice (saves it first)',       marg: 'F11  Print / save', screen: true },
  { id: 'help',         keys: 'Ctrl+F1', label: 'Show these shortcuts',                     marg: 'Ctrl + F1  Shortcut help' },
  { id: 'lock',         keys: 'Ctrl+Q',  label: 'Lock the app (when a PIN is set)',         marg: 'Ctrl + Q  Quit / logout' },
];

// Keys the app already uses on its own; a custom key may not take them.
export const FIXED_SHORTCUTS = [
  ['Ctrl+K', 'Search / jump to any page'],
  ['Ctrl+N', 'New invoice'],
  ['Ctrl+S', 'Save the invoice (invoice screen)'],
  ['Ctrl+P', 'Download the PDF (invoice screen)'],
  ['Ctrl+Enter', 'Add an invoice line (invoice screen)'],
  ['Ctrl+Shift+D', 'Repeat the last invoice line (invoice screen)'],
  ['Ctrl+Shift+L', 'Lock the app'],
  ['Ctrl+/', 'Show these shortcuts'],
  ['Esc', 'Close the open window'],
];

// Keys the browser or the computer keeps for itself, so a page never sees
// them (or must not take them: typing, Tab between fields).
const BLOCKED = new Set(['Ctrl+W', 'Ctrl+T', 'Ctrl+Shift+T', 'Ctrl+Shift+N', 'Ctrl+Tab', 'Ctrl+Shift+Tab', 'Alt+F4', 'Alt+Tab', 'Tab', 'Shift+Tab', 'Enter', 'Backspace', 'Delete', 'Space', 'Escape']);

const STORE_KEY = 'reazix_shortcuts';
const CHANGE_EVENT = 'reazix-shortcuts-changed';

export function getShortcutKeys() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch { /* storage blocked or bad JSON */ }
  const out = {};
  for (const a of SHORTCUT_ACTIONS) out[a.id] = typeof saved[a.id] === 'string' ? saved[a.id] : a.keys;
  return out; // '' = turned off
}

export function saveShortcutKeys(map) {
  // Only what differs from the default is stored, so a later change of a
  // default still reaches people who never touched that key.
  const diff = {};
  for (const a of SHORTCUT_ACTIONS) if (map[a.id] !== undefined && map[a.id] !== a.keys) diff[a.id] = map[a.id];
  try { localStorage.setItem(STORE_KEY, JSON.stringify(diff)); } catch { /* storage blocked */ }
  try { window.dispatchEvent(new Event(CHANGE_EVENT)); } catch { /* no window */ }
}

export function onShortcutKeysChange(fn) {
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'AltGraph', 'CapsLock', 'OS']);

// The key pressed, as "Ctrl+Alt+Shift+X". Letters and digits come from
// e.code so Alt+N still reads as N on a Mac (where Option+N types "˜") and on
// other keyboard layouts. Cmd on a Mac counts as Ctrl, as everywhere else in
// the app. Returns '' for a modifier pressed on its own.
export function comboFromEvent(e) {
  if (!e || MODIFIER_KEYS.has(e.key)) return '';
  let key = '';
  const code = e.code || '';
  if (/^Key[A-Z]$/.test(code)) key = code.slice(3);
  else if (/^Digit[0-9]$/.test(code)) key = code.slice(5);
  else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(e.key)) key = e.key;
  else if (e.key === ' ') key = 'Space';
  else if (e.key === '/' || code === 'Slash') key = '/';
  else if (e.key && e.key.length === 1) key = e.key.toUpperCase();
  else key = e.key || '';
  if (!key) return '';
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(key);
  return parts.join('+');
}

// Why a key cannot be used for an action, or '' when it can.
export function shortcutProblem(combo, actionId, current) {
  if (!combo) return '';
  if (BLOCKED.has(combo)) return `${combo} is kept by the browser or used for typing.`;
  const fixed = FIXED_SHORTCUTS.find(([k]) => k === combo);
  if (fixed) return `${combo} is already used for: ${fixed[1]}.`;
  const bare = !combo.includes('+');
  if (bare && !/^F([1-9]|1[0-9]|2[0-4])$/.test(combo)) return 'Add Ctrl or Alt: a single letter or number key is needed for typing.';
  const other = SHORTCUT_ACTIONS.find((a) => a.id !== actionId && current[a.id] === combo);
  if (other) return `${combo} is already set for: ${other.label}.`;
  return '';
}

// Shown on screen: "Ctrl + I", with ⌘ on a Mac.
export function formatCombo(combo) {
  if (!combo) return '';
  const mac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || '');
  return combo.split('+').map((p) => (p === 'Ctrl' && mac ? '⌘' : p === 'Alt' && mac ? 'Option' : p)).join(' + ');
}

// ---------------------------------------------------------------------------
// Enter moves to the next box (MARG style). On by default; turned off in
// Settings › Shortcut keys. Enter still does its own job where it has one
// (picking a suggestion, a barcode scan, adding a row from an item row's last
// box): those handlers mark the key as used, and then it does not move. On the
// last box of a form, Enter is left alone so the form can still be submitted.
// ---------------------------------------------------------------------------
const PREFS_KEY = 'reazix_shortcutPrefs';

export function getEnterMovesNext() {
  try { return (JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}).enterMovesNext !== false; } catch { return true; }
}

export function setEnterMovesNext(on) {
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch { /* bad JSON */ }
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, enterMovesNext: !!on })); } catch { /* storage blocked */ }
  try { window.dispatchEvent(new Event(CHANGE_EVENT)); } catch { /* no window */ }
}

// A handler that blocks Enter only to stop a line break (not to use it) calls
// this so Enter can still move on.
export function markEnterMayMove(e) {
  const native = e?.nativeEvent || e;
  if (native) native.enterMayMove = true;
}

const SKIP_TYPES = new Set(['hidden', 'checkbox', 'radio', 'file', 'button', 'submit', 'reset', 'image', 'range', 'color', 'password']);

// A box Enter moves between: typing boxes and dropdowns you can see and use.
export function isEnterField(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return false;
  if (el.disabled || el.readOnly || el.tabIndex < 0) return false;
  if (tag === 'INPUT' && SKIP_TYPES.has((el.type || 'text').toLowerCase())) return false;
  if (el.closest('[data-enter-native], [aria-hidden="true"]')) return false;
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
}

// The box after `el` on the same window (an open dialog) or page, or null.
export function nextFieldAfter(el) {
  const scope = el.closest('.modal-content') || el.closest('.main-content');
  if (!scope) return null;
  const fields = Array.from(scope.querySelectorAll('input, select, textarea')).filter(isEnterField);
  const i = fields.indexOf(el);
  return i >= 0 && i < fields.length - 1 ? fields[i + 1] : null;
}
