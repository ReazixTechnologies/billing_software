// A welcome for new users at the top of the Dashboard: what to expect and
// where to get help. On the page, not a popup; shown until closed and only
// while the business has fewer than 10 invoices.
import { useState } from 'react';
import { LifeBuoy, X } from 'lucide-react';
import { PRODUCT_NAME, UPDATE_YEARS } from '../brand';
import HelpButton from './HelpButton';

const KEY = 'reazix_welcomeCard';
const MAX_INVOICES = 10;

const isClosed = () => { try { return localStorage.getItem(KEY) === 'closed'; } catch { return false; } };

export default function WelcomeCard({ invoiceCount, onOpenSupport }) {
  const [closed, setClosed] = useState(isClosed);
  if (closed || invoiceCount >= MAX_INVOICES) return null;
  const close = () => {
    try { localStorage.setItem(KEY, 'closed'); } catch { /* private mode */ }
    setClosed(true);
  };
  return (
    <section className="welcome-card" aria-labelledby="welcome-card-title">
      <button type="button" className="welcome-card-close" onClick={close} aria-label="Close the welcome note">
        <X size={18} />
      </button>
      <h2 id="welcome-card-title">Welcome to {PRODUCT_NAME} <HelpButton title="The welcome note" doc="dashboard#welcome-card" size={16} /></h2>
      <p className="welcome-card-lead">
        Thank you for choosing {PRODUCT_NAME}. Here is what you can count on.
      </p>
      <ul className="welcome-card-points">
        <li><strong>Yours for life.</strong> One payment, no subscription, no ads.</li>
        <li><strong>Your data stays yours.</strong> Everything is saved on this PC and works offline.</li>
        <li><strong>{UPDATE_YEARS} years of updates.</strong> New features and fixes; the app tells you when one is ready.</li>
        <li><strong>Help when you need it.</strong> Email us from Help &amp; Support in the menu.</li>
      </ul>
      <div className="welcome-card-actions">
        <button type="button" className="welcome-card-btn welcome-card-btn-primary" onClick={close}>Start billing</button>
        <button type="button" className="welcome-card-btn" onClick={onOpenSupport}>
          <LifeBuoy size={16} /> Help &amp; Support
        </button>
      </div>
    </section>
  );
}
