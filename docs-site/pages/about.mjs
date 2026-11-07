// Help & Support - the docs-site twin of the app's Help & Support page
// (src/components/SupportView.jsx). Keep the two saying the same things.
import { SITE } from '../site.mjs';

const ui = (s) => `<span class="ui">${s}</span>`;
const mail = (subject) => `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}`;

export default [
{
  slug: 'support',
  title: 'Help & Support',
  nav: 'Help & Support',
  lead: 'How to reach Reazix, what your purchase includes, and what changed in each update.',
  body: `
<section id="contact">
<h2>Contact Reazix</h2>
<p>${SITE.name} is made by <a href="${SITE.publisher.url}">Reazix</a>. For a question, a problem, or something you need the app to do, email <a href="${mail(`${SITE.name} support`)}">${SITE.email}</a>.</p>
<p>Your invoices stay on your computer: we never see them unless you send them to us. Before sending a screenshot, hide your GSTIN and bank details.</p>
<p>In the app, ${ui(`Email ${SITE.email}`)} opens your email program with the subject filled in, and ${ui('reazix.com')} opens our website.</p>
</section>

<section id="updates">
<h2>Updates</h2>
<p>Your purchase includes ${SITE.updateYears} years of updates. When a new version is ready the app tells you: click <b>Update</b> in the sidebar, and your invoices and settings are kept. See <a href="update.html#in-app">Updating the app</a>.</p>
</section>

<section id="feedback">
<h2>Report a problem or ask for a feature</h2>
<ul>
  <li><strong>${ui('Report a problem')}</strong>: opens an email to us. Say which version, which computer, and what you did. For a problem the app logged, ${ui('Report')} in the <a href="troubleshooting.html#problem-log">Problem log</a> is better: it fills in the details for you.</li>
  <li><strong>${ui('Ask for a feature')}</strong>: opens an email to us. Requests from customers decide what comes next.</li>
</ul>
</section>

<section id="whats-new">
<h2>What's new</h2>
<p>The <b>What's new</b> card in the app lists the last six updates, read from the changelog that comes with your copy of the app. The newest is open; click any version number to open or close it. Each shows its date, a one-line summary and the changes grouped under headings such as <i>Added</i> and <i>Fixed</i>.</p>
<p>The card shows what <b>your</b> copy contains. If it stops at an older version, you have not updated yet: see <a href="update.html#in-app">Updating the app</a>.</p>
</section>

<section id="in-the-app">
<h2>In the app</h2>
<p>The same page is in the app: <b>Help &amp; Support</b>, near the bottom of the sidebar. From top to bottom it has <a href="#contact">Contact Reazix</a>, <a href="#updates">Updates</a>, <a href="security.html">Safe and private</a>, <a href="#feedback">Tell us what you need</a>, <a href="#whats-new">What's new</a> and the <a href="troubleshooting.html#problem-log">Problem log</a>.</p>
</section>
`,
},
];
