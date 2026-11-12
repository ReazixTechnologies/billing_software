// Reazix product details used across the app. Change them here, in one place.
export const PRODUCT_NAME = 'Reazix Billing';
export const COMPANY = 'Reazix';
export const WEBSITE = 'https://reazix.com';
export const CONTACT_EMAIL = 'contact@reazix.com';
// Shown on the product key screen, with a WhatsApp link. With country code,
// e.g. '+91 98765 43210'. Empty: only the email is shown.
export const CONTACT_PHONE = '+91 82755 29298';
// Downloads, updates and the help pages (billing.reazix.com, not live yet).
export const PRODUCT_SITE = 'https://billing.reazix.com';
export const UPDATE_YEARS = 3;

export const mailto = (subject, body = '') =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
