// Help & Support: who makes the app, how to reach Reazix, what's new, and the
// problem log.
import { Mail, Globe, LifeBuoy, RefreshCw } from 'lucide-react';
import { PRODUCT_NAME, COMPANY, WEBSITE, CONTACT_EMAIL, UPDATE_YEARS, mailto } from '../brand';
import WhatsNew from './WhatsNew';
import ProblemLog from './ProblemLog';
import HelpButton from './HelpButton';
import { SafePrivateSection } from './SafePrivateNote';

const card = { padding: '1.25rem 1.5rem' };

export default function SupportView() {
  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Help &amp; Support <HelpButton title="Help & Support" doc="support" size={16} style={{ marginLeft: 6 }} /></h1>
          <p className="page-subtitle">{PRODUCT_NAME} by {COMPANY}: contact us, what&apos;s new, and the problem log</p>
        </div>
      </div>

      <div className="glass-panel" style={{ ...card, marginBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <LifeBuoy size={28} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem' }}>Contact {COMPANY}</h3>
          <p style={{ margin: '0 0 0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '70ch' }}>
            A question, a problem, or something you need {PRODUCT_NAME} to do? Email us and we will get back to you.
            Your invoices stay on this computer: we never see them unless you send them to us.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <a className="btn btn-primary" href={mailto(`${PRODUCT_NAME} support`)}>
              <Mail size={16} /> Email {CONTACT_EMAIL}
            </a>
            <a className="btn btn-secondary" href={WEBSITE} target="_blank" rel="noopener noreferrer">
              <Globe size={16} /> {WEBSITE.replace(/^https:\/\//, '')}
            </a>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ ...card, marginBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <RefreshCw size={26} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem' }}>Updates</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '70ch' }}>
            Your purchase includes {UPDATE_YEARS} years of updates. When a new version is ready the app tells you:
            click <b>Update</b> in the sidebar, and your invoices and settings are kept.
          </p>
        </div>
      </div>

      <SafePrivateSection style={{ marginBottom: '1.25rem' }} />

      <WhatsNew />

      <ProblemLog />
    </div>
  );
}
