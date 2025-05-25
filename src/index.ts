#!/usr/bin/env node
import { LocalRepoScannerServer } from './server.js';

async function main(): Promise<void> {
  try {
    // MCP servers receive configuration via command line arguments
    // The config is passed as a JSON string in the --config argument
    const configArg = process.argv.find((arg) => arg.startsWith('--config='));
    let mcpConfig: unknown;

    if (configArg) {
      try {
        const configJson = configArg.slice('--config='.length);
        mcpConfig = JSON.parse(configJson);
      } catch (error) {
        console.error('Failed to parse MCP config:', error);
      }
    }

    const server = new LocalRepoScannerServer(mcpConfig);
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
