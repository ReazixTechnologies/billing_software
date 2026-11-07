// Reazix product details used across the app. Change them here, in one place.
export const PRODUCT_NAME = 'Reazix Billing';
export const COMPANY = 'Reazix';
export const WEBSITE = 'https://reazix.com';
export const CONTACT_EMAIL = 'contact@reazix.com';
// Downloads, updates and the help pages (billing.reazix.com, not live yet).
export const PRODUCT_SITE = 'https://billing.reazix.com';
export const UPDATE_YEARS = 3;

export const mailto = (subject, body = '') =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
