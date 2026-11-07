// Site-wide settings and the sidebar. The sidebar order is also the
// Previous / Next order at the foot of each page.

export const SITE = {
  name: 'Reazix Billing',
  // The folder is also the web address, so it carries the words people search.
  folder: 'help',
  // Where the folder is published. Used for canonical links, the sitemap,
  // social previews and llms.txt, which all need full addresses.
  url: 'https://billing.reazix.com/help/',
  publisher: { name: 'Reazix', url: 'https://reazix.com' },
  version: '1.0.0',
  email: 'contact@reazix.com',
  updateYears: 3,
  // Always the newest release (billing.reazix.com keeps this name current).
  download: 'https://billing.reazix.com/download/Reazix-Billing.zip',
};

// Search-result titles and descriptions for the pages people search for most.
// Other pages use their own title and the first ~155 characters of their lead.
export const SEO = {
  index: {
    title: 'Reazix Billing Software for India: documentation and user guide',
    description: 'GST billing software for Windows, Mac and Linux. Make GST invoices, track payments and stock, and prepare GSTR-1 and GSTR-3B. Works offline; your data stays on your computer.',
  },
  install: {
    title: 'How to install Reazix Billing Software on Windows, Mac and Linux',
    description: 'Download one ZIP, extract it and click Install. Sets up everything on Windows without admin rights. Step-by-step install for Windows, macOS and Linux.',
  },
  'first-invoice': {
    title: 'How to make your first GST invoice (step by step)',
    description: 'Make a GST tax invoice in five minutes: add your business, the client and items. CGST, SGST or IGST is worked out for you. Save, download the PDF and send it.',
  },
  invoices: {
    title: 'How to make a GST tax invoice: every field explained',
    description: 'Every part of the invoice screen: document types, GSTIN check, HSN codes, discounts, CGST/SGST/IGST, reverse charge, TDS and TCS, e-way bill, print and WhatsApp.',
  },
  'gst-returns': {
    title: 'GSTR-1 and GSTR-3B JSON from your invoices, and GSTR-2B matching',
    description: 'Build GSTR-1 and GSTR-3B from your invoices and purchases, download the JSON for the GST portal, and match your input tax credit against GSTR-2B.',
  },
  'thermal-printing': {
    title: 'GST bill printing on 58 mm and 80 mm thermal receipt printers',
    description: 'Print GST bills on 58 mm and 80 mm thermal printers: set up the printer, the print preview, auto-print on save, what a receipt shows, and fixes for faint or cut-off prints.',
  },
};

export const NAV = [
  { title: 'Start here', pages: ['index', 'install', 'install-mac', 'install-linux', 'update', 'first-run', 'first-invoice', 'gst-basics', 'security'] },
  { title: 'Invoicing', pages: ['invoices', 'invoice-options', 'thermal-printing', 'dashboard'] },
  { title: 'Clients, stock and payments', pages: ['clients', 'products', 'receipts', 'cash-book', 'recurring'] },
  { title: 'Buying', pages: ['purchases', 'expenses'] },
  { title: 'Tax and reports', pages: ['gst-returns', 'reports', 'income-tax'] },
  { title: 'Setting up', pages: ['settings', 'print-settings', 'backup', 'control-panel'] },
  { title: 'Help', pages: ['shortcuts', 'troubleshooting', 'terminal', 'limitations', 'glossary', 'support'] },
];
