#!/usr/bin/env tsx

import { emailWorker } from '../lib/queue/email-worker';

// Start the email worker
emailWorker.start().catch(error => {
  console.error('Failed to start email worker:', error);
  process.exit(1);
});