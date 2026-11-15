import { LANDING_PATHS } from "./landing-policy";

/** The GA4 web stream for haabcalendar.com. */
export const GOOGLE_MEASUREMENT_ID = "G-2RHC147XNR";

/**
 * Run before loading gtag: a manage URL is a booking credential. Once a visit
 * leaves marketing, keep Google's documented opt-out flag set until reload,
 * so automatic events cannot include a private URL or a private referrer.
 */
export const GOOGLE_ANALYTICS_SCRIPT = `
(function () {
  var paths = ${JSON.stringify([...LANDING_PATHS, "/gallery", "/privacy", "/terms"])};
  var id = ${JSON.stringify(GOOGLE_MEASUREMENT_ID)};
  var disabled = 'ga-disable-' + id;
  function allowed(href) {
    var url = new URL(href, window.location.href);
    return paths.indexOf(url.pathname) !== -1 && (!url.hash || /^#[a-z][a-z0-9-]*$/.test(url.hash)) &&
      Array.from(url.searchParams.keys()).every(function (key) {
        return /^(lang|utm_source|utm_medium|utm_campaign|utm_term|utm_content|utm_id)$/.test(key);
      });
  }
  if (['haabcalendar.com', 'www.haabcalendar.com'].indexOf(window.location.hostname) === -1 ||
      !allowed(window.location.href) || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;

  ['pushState', 'replaceState'].forEach(function (method) {
    var original = window.history[method];
    window.history[method] = function (state, unused, url) {
      if (url != null && !allowed(url)) window[disabled] = true;
      return original.apply(this, arguments);
    };
  });
  window.addEventListener('popstate', function () {
    if (!allowed(window.location.href)) window[disabled] = true;
  });
  window.addEventListener('hashchange', function () {
    if (!allowed(window.location.href)) window[disabled] = true;
  });

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  var referrer = '';
  try { referrer = new URL(document.referrer).origin; } catch (_) {}
  var config = {
    page_location: window.location.origin + window.location.pathname,
    page_referrer: referrer,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  };
  var params = new URL(window.location.href).searchParams;
  [['source', 'source'], ['medium', 'medium'], ['campaign', 'name'], ['term', 'term'], ['content', 'content'], ['id', 'id']].forEach(function (pair) {
    var value = params.get('utm_' + pair[0]);
    if (value) config['campaign_' + pair[1]] = value;
  });
  // The Google tag's own GA tag fires on initialization and ignores this page's
  // config; queue the privacy settings with 'set' before 'js' so its automatic
  // page view uses them.
  gtag('set', config);
  gtag('js', new Date());
  gtag('config', id, config);
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(script);
})();
`;
