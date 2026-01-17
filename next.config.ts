import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "luma-comply",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  // Hide source maps from generated client bundles
  sourcemaps: {
    disable: true,
  },

  // Webpack-specific options
  webpack: {
    // Tree-shake Sentry logger statements
    treeshake: {
      removeDebugLogging: true,
    },
    // Annotate React components for better error tracking
    reactComponentAnnotation: {
      enabled: true,
    },
    // Enable Vercel Cron Monitors
    automaticVercelMonitors: true,
  },
});
