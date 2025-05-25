import { readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

export interface Config {
  repoBasePath: string;
  searchableDirectories: string[];
  cacheDir: string;
}

export function loadConfig(): Config {
  const configPath = resolve(process.cwd(), 'config.json');

  // Check if config file exists
  if (!existsSync(configPath)) {
    throw new Error(
      `Configuration file not found at ${configPath}. Please create a config.json file based on config.example.json`
    );
  }

  // Read and parse config file
  let configData: unknown;
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    configData = JSON.parse(configContent) as unknown;
  } catch (error) {
    throw new Error(
      `Failed to parse config.json: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Type guard to check if config is an object
  if (typeof configData !== 'object' || configData === null) {
    throw new Error('Invalid configuration: config.json must contain an object');
  }

  const config = configData as Record<string, unknown>;

  // Validate required fields
  if (typeof config['repoBasePath'] !== 'string') {
    throw new Error('Missing or invalid configuration field: repoBasePath (must be a string)');
  }
  if (!Array.isArray(config['searchableDirectories'])) {
    throw new Error(
      'Missing or invalid configuration field: searchableDirectories (must be an array)'
    );
  }

  // Validate searchableDirectories contains strings
  const searchableDirectories = config['searchableDirectories'] as unknown[];
  if (!searchableDirectories.every((dir): dir is string => typeof dir === 'string')) {
    throw new Error('Invalid configuration: searchableDirectories must contain only strings');
  }

  // Resolve paths
  const repoBasePath = resolve(process.cwd(), config['repoBasePath']);
  const cacheDir = 
    typeof config['cacheDir'] === 'string'
      ? resolve(process.cwd(), config['cacheDir'])
      : resolve(process.cwd(), 'mcp-cache');

  // Validate repo base path exists
  if (!existsSync(repoBasePath)) {
    throw new Error(`Repository base path does not exist: ${repoBasePath}`);
  }

  // Create cache directory if it doesn't exist
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  return {
    repoBasePath,
    searchableDirectories,
    cacheDir,
  };
}
