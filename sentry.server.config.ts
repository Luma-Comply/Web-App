import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://38ac1d7e7f1463d8a1356c434e6c2778@o4510727423066112.ingest.us.sentry.io/4510727439384576",

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // Adjust this in production
  tracesSampleRate: 0.1, // 10% of requests

  // Set profilesSampleRate for profiling
  profilesSampleRate: 0.1,

  // Environment
  environment: process.env.NODE_ENV,

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    // Filter out sensitive headers/data
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['stripe-signature'];
      }
    }

    // Filter out sensitive query params
    if (event.request?.query_string && typeof event.request.query_string === 'string') {
      const filtered = event.request.query_string
        .split('&')
        .filter(param => !param.startsWith('token=') && !param.startsWith('key='))
        .join('&');
      event.request.query_string = filtered;
    }

    return event;
  },
});
