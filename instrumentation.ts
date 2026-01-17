import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export function onRequestError(err: unknown, request: Request) {
  Sentry.captureException(err, {
    contexts: {
      nextjs: {
        request: {
          url: request.url,
          method: request.method,
          headers: Object.fromEntries(request.headers),
        },
      },
    },
  });
}
