// Settings › Shortcut keys: change, turn off or reset the MARG-style keys
// (utils/shortcuts.js). Saves as it changes, like Print & PDF.
import { useState } from 'react';
import { Keyboard, RotateCcw } from 'lucide-react';
import { toast } from './Toast';
import {
  SHORTCUT_ACTIONS, FIXED_SHORTCUTS, getShortcutKeys, saveShortcutKeys,
  comboFromEvent, shortcutProblem, formatCombo, getEnterMovesNext, setEnterMovesNext,
} from '../utils/shortcuts';

const kbd = {
  display: 'inline-block', minWidth: 64, textAlign: 'center',
  padding: '0.25rem 0.55rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700,
  border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)',
};

export default function ShortcutSettings() {
  const [keys, setKeys] = useState(() => getShortcutKeys());
  const [recording, setRecording] = useState(null); // action id waiting for a key
  const [problem, setProblem] = useState('');
  const [enterMoves, setEnterMoves] = useState(() => getEnterMovesNext());

  const update = (next) => { setKeys(next); saveShortcutKeys(next); };

  const onRecordKey = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') { setRecording(null); setProblem(''); return; }
    const combo = comboFromEvent(e);
    if (!combo) return; // a modifier on its own: wait for the rest
    const why = shortcutProblem(combo, id, keys);
    if (why) { setProblem(why); return; }
    update({ ...keys, [id]: combo });
    setRecording(null);
    setProblem('');
    toast(`Shortcut set: ${formatCombo(combo)}`, 'success');
  };

  const isDefault = SHORTCUT_ACTIONS.every((a) => keys[a.id] === a.keys);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 className="section-title" style={{ marginTop: 0, marginBottom: '0.25rem' }}>
            <Keyboard size={18} style={{ display: 'inline', verticalAlign: -3, marginRight: 6 }} />
            Shortcut keys
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
            The keys MARG ERP users know, for the same jobs here. Press <strong>Change</strong>, then press the new key.
            Keys marked “on this screen” work on the screen you are on, as in MARG. Changes save straight away.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" disabled={isDefault}
          onClick={() => { update(Object.fromEntries(SHORTCUT_ACTIONS.map((a) => [a.id, a.keys]))); setRecording(null); setProblem(''); toast('Shortcut keys reset', 'success'); }}>
          <RotateCcw size={16} /> Reset all
        </button>
      </div>

      <label style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', marginTop: '1rem',
        padding: '0.7rem 0.8rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)',
      }}>
        <input type="checkbox" checked={enterMoves} style={{ marginTop: 3, accentColor: 'var(--primary)' }}
          onChange={(e) => { setEnterMoves(e.target.checked); setEnterMovesNext(e.target.checked); }} />
        <span>
          <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>Enter moves to the next box</span>
          <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            As in MARG: on the invoice, Enter goes Client Name → Phone No. → Attended By → Scan barcode → Item → Qty → Rate …,
            and Enter on the last box of an item adds the next item. Works on every screen and form. Enter still picks a
            highlighted suggestion and still finishes a barcode scan. Alt + N opens a new invoice with the cursor in Client Name.
          </span>
        </span>
      </label>

      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {SHORTCUT_ACTIONS.map((a) => {
          const current = keys[a.id];
          const rec = recording === a.id;
          return (
            <div key={a.id} style={{
              display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '0.75rem', alignItems: 'center',
              padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)',
              background: rec ? 'var(--primary-light, rgba(30,64,175,0.08))' : 'var(--card-bg)',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                  {a.label}
                  {a.screen && <span style={{ marginLeft: 6, fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>(on this screen)</span>}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>MARG: {a.marg}</div>
                {rec && problem && <div style={{ fontSize: '0.74rem', color: '#d97706', marginTop: 3 }}>{problem}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {rec ? (
                  <button type="button" autoFocus data-shortcut-recorder=""
                    onKeyDown={(e) => onRecordKey(e, a.id)}
                    onBlur={() => { setRecording(null); setProblem(''); }}
                    style={{ ...kbd, minWidth: 150, borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                    Press a key… (Esc to cancel)
                  </button>
                ) : (
                  <span style={{ ...kbd, color: current ? 'var(--text)' : 'var(--text-muted)' }}>{current ? formatCombo(current) : 'Off'}</span>
                )}
                {!rec && (
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    onClick={() => { setRecording(a.id); setProblem(''); }}>Change</button>
                )}
                {!rec && current && (
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    onClick={() => update({ ...keys, [a.id]: '' })} title="Turn this shortcut off">Off</button>
                )}
                {!rec && current !== a.keys && (
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    disabled={!!shortcutProblem(a.keys, a.id, keys)}
                    title={shortcutProblem(a.keys, a.id, keys) || `Back to ${formatCombo(a.keys)}`}
                    onClick={() => update({ ...keys, [a.id]: a.keys })}>Default</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <details style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Keys the app already uses (cannot be changed)</summary>
        <table className="kv-list" style={{ marginTop: '0.5rem' }}>
          <tbody>
            {FIXED_SHORTCUTS.map(([k, label]) => (
              <tr key={k}><td><kbd>{formatCombo(k)}</kbd></td><td>{label}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.75rem 0 0' }}>
        Not included because this app has no such feature: F12 calculator, Alt + A counter sale, Ctrl + U change user,
        Alt + L last deal, Ctrl + Tab batch details, Alt + F11 item sets, Ctrl + F9 bill adjustments, and MARG's other F-keys.
        F11 is full screen in some browsers; if it does nothing, change Print to another key.
      </p>
    </div>
  );
}
