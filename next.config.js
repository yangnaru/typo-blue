/** @type {import('next').NextConfig} */
const nextConfig = {
    // .next/standalone holds only the files the server was traced to use, so
    // the image can leave node_modules and the sources behind.
    output: 'standalone',
    serverExternalPackages: ['@node-rs/argon2'],
    // Only this site's own image host: /_next/image resizes whatever these
    // allow, and any *.r2.dev bucket would have let anyone's images through.
    // NEXT_PUBLIC_R2_PUBLIC_URL is set at build time, like the other
    // NEXT_PUBLIC_* settings.
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: new URL(
                    process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://r2.typo.blue'
                ).hostname,
            },
        ],
    },
}

module.exports = nextConfig


// Injected content via Sentry wizard below

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS config
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  module.exports,
  {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "jihyeok-seo",
    project: "typo-blue",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    // tunnelRoute: "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
