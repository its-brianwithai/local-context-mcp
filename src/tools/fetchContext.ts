import * as path from 'path';
import { promises as fs } from 'fs';
import type { FetchContextRequest, ExtractedCode } from '../types';
import { findMatchingFiles } from '../utils/patternMatcher.js';
import { extractCodeFromFile } from '../utils/codeExtractor.js';
import { findReferencingFiles } from '../utils/referenceTracker.js';
import { buildMarkdownExplanation } from '../utils/markdownBuilder.js';
import { getCachedResult, saveToCache } from '../utils/cacheManager.js';

export interface FetchContextConfig {
  repoBasePath: string;
  searchableDirectories: string[];
  cacheDir: string;
}

/**
 * Main function to fetch context by searching across configured directories
 */
export async function fetchContext(
  request: FetchContextRequest,
  config: FetchContextConfig
): Promise<string> {
  const results: string[] = [];
  const matchedDirectories: string[] = [];

  // Find directories that match any of the search terms
  for (const dir of config.searchableDirectories) {
    const dirLower = dir.toLowerCase();
    const dirPath = path.join(config.repoBasePath, dir);

    // Check if directory exists
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        continue;
      }
    } catch {
      // Skip non-existent directories
      continue;
    }

    // Check if any search term matches this directory
    const matches = request.search_terms.some((term) => dirLower.includes(term.toLowerCase()));

    if (matches) {
      matchedDirectories.push(dir);
    }
  }

  // If no directories matched, return an error
  if (matchedDirectories.length === 0) {
    return (
      `# No directories found matching search terms\n\n` +
      `**Search terms:** ${request.search_terms.join(', ')}\n` +
      `**Configured directories:** ${config.searchableDirectories.join(', ')}\n`
    );
  }

  // Process each matched directory
  for (const targetDir of matchedDirectories) {
    const targetPath = path.join(config.repoBasePath, targetDir);

    // Find matching files
    const matchedFilePaths = await findMatchingFiles(targetPath, request.globs, request.regex);

    if (matchedFilePaths.length === 0 && ((request.globs?.length ?? 0) > 0 || (request.regex?.length ?? 0) > 0)) {
      results.push(
        `# Directory Analysis: ${targetDir}\n\nNo files found matching the specified patterns.\n\n` +
          `**Glob patterns:** ${request.globs?.join(', ') ?? 'None'}\n` +
          `**Regex patterns:** ${request.regex?.join(', ') ?? 'None'}\n`
      );
      continue;
    }

    // Find referencing files if needed
    let referencingFilePaths: string[] = [];
    if (matchedFilePaths.length > 0 && (request.reference_depth ?? -1) !== 0) {
      const references = await findReferencingFiles(
        matchedFilePaths,
        targetPath,
        request.reference_depth ?? -1
      );

      // Extract just the file paths, excluding the matched files themselves
      referencingFilePaths = Array.from(references.keys()).filter(
        (f) => !matchedFilePaths.includes(f)
      );
    }

    // All files we need to analyze
    const allFiles = [...matchedFilePaths, ...referencingFilePaths];

    // Check cache (using single directory for compatibility)
    const singleDirRequest = { ...request, target_directory: targetDir };
    const cachedResult = await getCachedResult(config.cacheDir, singleDirRequest, allFiles);
    if (cachedResult !== null) {
      results.push(cachedResult);
      continue;
    }

    // Extract code from all files
    const matchedFileData = new Map<string, ExtractedCode>();
    const referencingFileData = new Map<string, ExtractedCode>();

    // Process matched files
    for (const filePath of matchedFilePaths) {
      const extracted = await extractCodeFromFile(filePath);
      matchedFileData.set(filePath, extracted);
    }

    // Process referencing files
    for (const filePath of referencingFilePaths) {
      const extracted = await extractCodeFromFile(filePath);
      referencingFileData.set(filePath, extracted);
    }

    // Find README
    let readmePath: string | undefined;
    const possibleReadmes = ['README.md', 'readme.md', 'README.MD'];

    for (const readmeName of possibleReadmes) {
      const testPath = path.join(targetPath, readmeName);
      try {
        await fs.access(testPath);
        readmePath = testPath;
        break;
      } catch {
        // Continue searching
      }
    }

    // Build markdown explanation
    const markdown = await buildMarkdownExplanation({
      directoryName: targetDir,
      readmePath,
      matchedFiles: matchedFileData,
      referencingFiles: referencingFileData.size > 0 ? referencingFileData : undefined,
    });

    // Save to cache (using single directory for compatibility)
    await saveToCache(config.cacheDir, singleDirRequest, allFiles, markdown);

    results.push(markdown);
  }

  // Combine all results
  if (results.length === 1) {
    return results[0]!;
  } else {
    return results.join('\n\n---\n\n');
  }
}
