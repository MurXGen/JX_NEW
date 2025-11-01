// lib/gtag.js
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// page_view event
export const pageview = (url) => {
  if (!window.gtag) return;
  window.gtag("config", GA_MEASUREMENT_ID, { page_path: url });
};

// custom event
export const event = ({ action, category, label, value }) => {
  if (!window.gtag) return;
  window.gtag("event", action, {
    event_category: category,
    event_label: label,
    value,
  });
};
