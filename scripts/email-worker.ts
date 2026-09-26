#!/usr/bin/env tsx

// Runs the email worker on its own, for development. In production it runs
// inside the Next.js server (see instrumentation.ts).

import { emailWorker } from '../lib/queue/email-worker';

async function shutdown() {
  await emailWorker.stop();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the email worker
emailWorker.start().catch(error => {
  console.error('Failed to start email worker:', error);
  process.exit(1);
});
