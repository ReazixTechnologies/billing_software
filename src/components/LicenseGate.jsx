// Product key screen. The app opens only with a key from Reazix; the server
// checks it too (server.js, PRODUCT KEY), so this screen is the friendly half.
// The shop owner sends the PC Code to Reazix and pastes back the key.
import { useEffect, useState } from 'react';
import { KeyRound, Copy, Check } from 'lucide-react';
import { getLicenseStatus, activateLicense } from '../store';
import { getPrintSettings, savePrintSettings } from '../utils/printSettings';
import { PRODUCT_NAME, COMPANY, CONTACT_EMAIL, CONTACT_PHONE } from '../brand';

export const LICENSE_EVENT = 'reazix-license-needed';
const WARN_DAYS = 15;

const MESSAGES = {
  none: 'Enter the product key you got from Reazix to start using the app.',
  invalid: 'The saved product key is not valid. Enter your product key again.',
  'other-pc': 'The saved product key is for another PC. Send this PC Code to Reazix for a key.',
  expired: 'Your product key has ended. Contact Reazix to renew it. Your invoices and data are safe on this PC.',
  clock: "This PC's date looks wrong (it is earlier than a day the app already saw). Set the correct date and time, then reload.",
};

function KeyScreen({ status, onActive }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyPc = async () => {
    try { await navigator.clipboard.writeText(status.pc); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* select it by hand */ }
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!key.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const st = await activateLicense(key.trim());
      // A key with the shop's details has set up the header already: no
      // first-run wizard on this PC.
      if (st.business) {
        try { savePrintSettings({ ...getPrintSettings(), onboardingComplete: true, onboardingSkipped: false }); } catch { /* storage blocked */ }
      }
      onActive(st);
    } catch (err) {
      setError(err.body?.error || 'Could not check the key. Is the app still running?');
    } finally {
      setBusy(false);
    }
  };
  const whatsapp = CONTACT_PHONE
    ? `https://wa.me/${CONTACT_PHONE.replace(/\D/g, '')}?text=${encodeURIComponent(`${PRODUCT_NAME} product key request.\nPC Code: ${status.pc}\nShop name: `)}`
    : null;

  return (
    <div className="app-lock-screen">
      <form className="glass-panel app-lock-card license-card" onSubmit={submit}>
        <KeyRound size={32} aria-hidden="true" />
        <h1>{status.state === 'expired' ? 'Renew your product key' : 'Activate ' + PRODUCT_NAME}</h1>
        <p className="text-muted">{MESSAGES[status.state] || MESSAGES.none}</p>

        <div className="license-pc">
          <span className="text-muted">This PC's code</span>
          <strong aria-label="PC Code">{status.pc}</strong>
          <button type="button" className="btn btn-secondary btn-sm" onClick={copyPc}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>

        <label className="form-label" htmlFor="license-key">Product key</label>
        <textarea id="license-key" className="form-input license-input" rows={3} autoFocus spellCheck={false}
          placeholder="RZX1.…" value={key} onChange={(e) => { setKey(e.target.value); setError(''); }} disabled={busy} />
        <p className="app-lock-error" role="alert">{error}</p>
        <button type="submit" className="btn btn-primary" disabled={busy || !key.trim()}>{busy ? 'Checking…' : 'Activate'}</button>

        <p className="app-lock-help">
          No key? Send the PC Code above to {COMPANY}
          {CONTACT_PHONE && <> on <strong>{CONTACT_PHONE}</strong></>} or <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Product key')}&body=${encodeURIComponent(`PC Code: ${status.pc}\nShop name: `)}`}>{CONTACT_EMAIL}</a>.
          {whatsapp && <> <a href={whatsapp} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a></>}
        </p>
      </form>
    </div>
  );
}

// Shows the app only with an active key; a reminder bar in the last days.
export default function LicenseGate({ children }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const check = () => getLicenseStatus().then(setStatus).catch(() => setStatus({ state: 'unreachable' }));
    check();
    // The server refused a request (key ended while the app was open).
    window.addEventListener(LICENSE_EVENT, check);
    const hourly = setInterval(check, 60 * 60 * 1000);
    return () => { window.removeEventListener(LICENSE_EVENT, check); clearInterval(hourly); };
  }, []);

  if (!status) return null;
  // Server not reachable: let the app show its own "cannot connect" screens.
  if (status.state === 'unreachable') return children;
  if (status.state !== 'active') return <KeyScreen status={status} onActive={setStatus} />;
  return (
    <>
      {status.daysLeft <= WARN_DAYS && (
        <div className="license-warning" role="status">
          Your product key ends in {status.daysLeft} day{status.daysLeft === 1 ? '' : 's'} ({status.until}). Contact {COMPANY}
          {CONTACT_PHONE ? ` on ${CONTACT_PHONE}` : ` at ${CONTACT_EMAIL}`} to renew.
        </div>
      )}
      {children}
    </>
  );
}
