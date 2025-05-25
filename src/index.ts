#!/usr/bin/env node
import { LocalRepoScannerServer } from './server.js';

async function main() {
  try {
    const server = new LocalRepoScannerServer();
    await server.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});