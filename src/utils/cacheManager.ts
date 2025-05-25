import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface CacheRequest {
  target_directory?: string;
  target_directories?: string[];
  globs?: string[];
  regex?: string[];
  reference_depth?: number;
}

interface CacheMetadata {
  request: CacheRequest;
  generatedAt: string;
  fileModificationTimes: Record<string, number>;
}

/**
 * Generates a cache key based on request parameters and file modification times
 */
export function generateCacheKey(
  request: CacheRequest,
  filePaths: string[],
  modificationTimes: Record<string, number>
): string {
  const cacheData = {
    target_directory: request.target_directory,
    target_directories: request.target_directories,
    globs: request.globs || [],
    regex: request.regex || [],
    reference_depth: request.reference_depth ?? -1,
    files: filePaths.sort(),
    modTimes: modificationTimes
  };
  
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(cacheData))
    .digest('hex')
    .substring(0, 16);
  
  const dirName = request.target_directory || request.target_directories?.[0] || 'unknown';
  return `${dirName.replace(/[^a-zA-Z0-9]/g, '_')}_${hash}.md`;
}

/**
 * Gets modification times for a list of files
 */
export async function getFileModificationTimes(filePaths: string[]): Promise<Record<string, number>> {
  const modTimes: Record<string, number> = {};
  
  for (const filePath of filePaths) {
    try {
      const stats = await fs.stat(filePath);
      modTimes[filePath] = stats.mtimeMs;
    } catch (error) {
      // File might have been deleted, use 0
      modTimes[filePath] = 0;
    }
  }
  
  return modTimes;
}

/**
 * Checks if cached result is still valid
 */
export async function getCachedResult(
  cacheDir: string,
  request: CacheRequest,
  filePaths: string[]
): Promise<string | null> {
  const modTimes = await getFileModificationTimes(filePaths);
  const cacheKey = generateCacheKey(request, filePaths, modTimes);
  const cachePath = path.join(cacheDir, cacheKey);
  const metaPath = path.join(cacheDir, `${cacheKey}.meta.json`);
  
  try {
    // Check if cache files exist
    await fs.access(cachePath);
    await fs.access(metaPath);
    
    // Read metadata
    const metaContent = await fs.readFile(metaPath, 'utf-8');
    const metadata: CacheMetadata = JSON.parse(metaContent);
    
    // Check if any files have been modified
    for (const [filePath, cachedModTime] of Object.entries(metadata.fileModificationTimes)) {
      const currentModTime = modTimes[filePath] || 0;
      if (currentModTime !== cachedModTime) {
        // File has been modified, cache is invalid
        return null;
      }
    }
    
    // Cache is valid, return content
    return await fs.readFile(cachePath, 'utf-8');
    
  } catch (error) {
    // Cache doesn't exist or is invalid
    return null;
  }
}

/**
 * Saves result to cache
 */
export async function saveToCache(
  cacheDir: string,
  request: CacheRequest,
  filePaths: string[],
  content: string
): Promise<void> {
  const modTimes = await getFileModificationTimes(filePaths);
  const cacheKey = generateCacheKey(request, filePaths, modTimes);
  const cachePath = path.join(cacheDir, cacheKey);
  const metaPath = path.join(cacheDir, `${cacheKey}.meta.json`);
  
  const metadata: CacheMetadata = {
    request,
    generatedAt: new Date().toISOString(),
    fileModificationTimes: modTimes
  };
  
  await fs.writeFile(cachePath, content);
  await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
}