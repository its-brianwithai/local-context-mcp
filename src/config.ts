import { readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

export interface Config {
  searchableDirectories: string[];
  cacheDir: string;
}

export function loadConfig(mcpConfig?: unknown): Config {
  let fileConfig: Record<string, unknown> = {};
  let finalConfig: Record<string, unknown> = {};

  // First, try to load config.json file
  const configPath = resolve(process.cwd(), 'config.json');

  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      fileConfig = JSON.parse(configContent) as Record<string, unknown>;
    } catch (error) {
      console.error('Warning: Failed to parse config.json:', error);
    }
  }

  // Check for individual environment variables
  let envConfig: Record<string, unknown> = {};
  
  if (process.env['searchableDirectories']) {
    try {
      envConfig['searchableDirectories'] = JSON.parse(process.env['searchableDirectories']);
    } catch (error) {
      console.error('Warning: Failed to parse searchableDirectories environment variable:', error);
    }
  }
  
  if (process.env['cacheDir']) {
    envConfig['cacheDir'] = process.env['cacheDir'];
  }

  // Merge configs with precedence: mcpConfig > envConfig > fileConfig
  finalConfig = { ...fileConfig, ...envConfig };
  if (mcpConfig && typeof mcpConfig === 'object' && mcpConfig !== null) {
    const mcpConfigObj = mcpConfig as Record<string, unknown>;
    finalConfig = { ...finalConfig, ...mcpConfigObj };
  }

  // Validate the merged configuration
  if (!Array.isArray(finalConfig['searchableDirectories'])) {
    if (!existsSync(configPath)) {
      throw new Error(
        `No searchableDirectories configured. Please either:\n` +
          `1. Pass configuration via MCP (--config argument)\n` +
          `2. Create a config.json file based on config.example.json`
      );
    } else {
      throw new Error(
        'Missing or invalid configuration field: searchableDirectories (must be an array)'
      );
    }
  }

  const searchableDirectories = finalConfig['searchableDirectories'] as unknown[];
  if (!searchableDirectories.every((dir): dir is string => typeof dir === 'string')) {
    throw new Error('Invalid configuration: searchableDirectories must contain only strings');
  }

  if (searchableDirectories.length === 0) {
    throw new Error(
      'Configuration error: searchableDirectories must contain at least one directory'
    );
  }

  // Resolve all directory paths
  const resolvedDirectories = searchableDirectories.map((dir) => resolve(dir));

  // Validate all directories exist
  for (const dir of resolvedDirectories) {
    if (!existsSync(dir)) {
      throw new Error(`Searchable directory does not exist: ${dir}`);
    }
  }

  // Resolve cache directory path
  const cacheDir =
    typeof finalConfig['cacheDir'] === 'string'
      ? resolve(finalConfig['cacheDir'])
      : resolve(homedir(), '.cache', 'local-context-mcp');

  // Create cache directory if it doesn't exist
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  return {
    searchableDirectories: resolvedDirectories,
    cacheDir,
  };
}
