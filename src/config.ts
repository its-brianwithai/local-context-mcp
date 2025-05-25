import { readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

export interface Config {
  repoBasePath: string;
  cacheDir: string;
}

export function loadConfig(): Config {
  const configPath = resolve(process.cwd(), 'config.json');
  
  // Check if config file exists
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found at ${configPath}. Please create a config.json file based on config.example.json`);
  }
  
  // Read and parse config file
  let configData: any;
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    configData = JSON.parse(configContent);
  } catch (error) {
    throw new Error(`Failed to parse config.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Validate required fields
  if (!configData.repoBasePath) {
    throw new Error('Missing required configuration field: repoBasePath');
  }
  
  // Resolve paths
  const repoBasePath = resolve(process.cwd(), configData.repoBasePath);
  const cacheDir = configData.cacheDir ? 
    resolve(process.cwd(), configData.cacheDir) : 
    resolve(process.cwd(), 'mcp-cache');
  
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
    cacheDir
  };
}