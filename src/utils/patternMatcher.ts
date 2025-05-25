import * as fs from 'fs/promises';
import * as path from 'path';
import { minimatch } from 'minimatch';

/**
 * Find files by glob patterns recursively
 * @param basePath Base directory to search from
 * @param patterns Array of glob patterns
 * @returns Array of absolute file paths matching any of the patterns
 */
export async function findFilesByGlob(basePath: string, patterns: string[]): Promise<string[]> {
  if (patterns.length === 0) {
    return [];
  }

  const matchedFiles = new Set<string>();

  async function walkDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            // Skip node_modules and hidden directories
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              await walkDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            const relativePath = path.relative(basePath, fullPath);

            // Check if file matches any pattern
            for (const pattern of patterns) {
              try {
                if (minimatch(relativePath, pattern, { dot: true, matchBase: true })) {
                  matchedFiles.add(fullPath);
                  break; // No need to check other patterns
                }
              } catch (error) {
                console.error(`Invalid glob pattern "${pattern}": ${(error as Error).message}`);
              }
            }
          }
        })
      );
    } catch (error) {
      console.error(`Error reading directory ${dirPath}: ${(error as Error).message}`);
    }
  }

  await walkDirectory(basePath);
  return Array.from(matchedFiles).sort();
}

/**
 * Search file contents using regex patterns
 * @param files Array of file paths to search
 * @param patterns Array of regex patterns
 * @returns Array of file paths containing matches for any pattern
 */
export async function searchFilesByRegex(files: string[], patterns: string[]): Promise<string[]> {
  if (files.length === 0 || patterns.length === 0) {
    return [];
  }

  const matchedFiles = new Set<string>();
  const compiledPatterns: RegExp[] = [];

  // Compile regex patterns
  for (const pattern of patterns) {
    try {
      compiledPatterns.push(new RegExp(pattern, 'gm'));
    } catch (error) {
      console.error(`Invalid regex pattern "${pattern}": ${(error as Error).message}`);
    }
  }

  if (compiledPatterns.length === 0) {
    return [];
  }

  // Search files in parallel with concurrency limit
  const CONCURRENCY_LIMIT = 10;
  const chunks: string[][] = [];

  for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
    chunks.push(files.slice(i, i + CONCURRENCY_LIMIT));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (filePath) => {
        try {
          // Check if file exists and is readable
          const stats = await fs.stat(filePath);
          if (!stats.isFile()) {
            return;
          }

          // Read file content
          const content = await fs.readFile(filePath, 'utf-8');

          // Check if content matches any pattern
          for (const pattern of compiledPatterns) {
            if (pattern.test(content)) {
              matchedFiles.add(filePath);
              break; // No need to check other patterns
            }
          }
        } catch (error) {
          // Skip files that can't be read (binary files, permission issues, etc.)
          const err = error as NodeJS.ErrnoException;
          if (err.code !== 'ENOENT' && err.code !== 'EISDIR') {
            console.error(`Could not read file ${filePath}: ${err.message}`);
          }
        }
      })
    );
  }

  return Array.from(matchedFiles).sort();
}

/**
 * Find files matching either glob patterns OR containing regex matches
 * @param basePath Base directory to search from
 * @param globs Optional array of glob patterns for file paths
 * @param regex Optional array of regex patterns for file contents
 * @returns Array of file paths matching either condition
 */
export async function findMatchingFiles(
  basePath: string,
  globs?: string[],
  regex?: string[]
): Promise<string[]> {
  // Validate base path
  try {
    const stats = await fs.stat(basePath);
    if (!stats.isDirectory()) {
      throw new Error(`Base path "${basePath}" is not a directory`);
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw new Error(`Base path "${basePath}" does not exist`);
    }
    throw error;
  }

  const allMatchedFiles = new Set<string>();

  // Find files by glob patterns
  if (globs !== undefined && globs.length > 0) {
    const globMatches = await findFilesByGlob(basePath, globs);
    globMatches.forEach((file) => allMatchedFiles.add(file));
  }

  // Find files by regex content search
  if (regex !== undefined && regex.length > 0) {
    let filesToSearch: string[];

    if (globs !== undefined && globs.length > 0) {
      // If globs are specified, only search within those files
      filesToSearch = Array.from(allMatchedFiles);
    } else {
      // Otherwise, search all files in the directory
      filesToSearch = await findFilesByGlob(basePath, ['**/*']);
    }

    const regexMatches = await searchFilesByRegex(filesToSearch, regex);
    regexMatches.forEach((file) => allMatchedFiles.add(file));
  }

  // If neither globs nor regex provided, return empty array
  if ((globs === undefined || globs.length === 0) && (regex === undefined || regex.length === 0)) {
    return [];
  }

  return Array.from(allMatchedFiles).sort();
}
