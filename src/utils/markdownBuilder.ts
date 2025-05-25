import { promises as fs } from 'fs';
import * as path from 'path';
import type { ExtractedCode } from '../types/index.js';

interface BuildOptions {
  directoryName: string;
  readmePath?: string;
  matchedFiles: Map<string, ExtractedCode>;
  referencingFiles?: Map<string, ExtractedCode>;
}

/**
 * Builds a comprehensive markdown explanation of a directory
 */
export async function buildMarkdownExplanation(options: BuildOptions): Promise<string> {
  const { directoryName, readmePath, matchedFiles, referencingFiles } = options;
  const sections: string[] = [];

  // Header
  sections.push(`# Directory Analysis: ${directoryName}`);
  sections.push('');
  sections.push(`Generated: ${new Date().toISOString()}`);
  sections.push('');

  // Table of Contents
  sections.push('## Table of Contents');
  sections.push('');
  sections.push('1. [Overview](#overview)');
  sections.push('2. [Matched Files](#matched-files)');
  if (referencingFiles && referencingFiles.size > 0) {
    sections.push('3. [Referencing Files](#referencing-files)');
  }
  sections.push('');

  // Overview section with README
  sections.push('## Overview');
  sections.push('');

  if (readmePath !== undefined) {
    try {
      const readmeContent = await fs.readFile(readmePath, 'utf-8');
      sections.push('### README');
      sections.push('');
      sections.push(readmeContent);
      sections.push('');
    } catch {
      sections.push('*README not found or could not be read*');
      sections.push('');
    }
  } else {
    sections.push('*No README found*');
    sections.push('');
  }

  // Matched Files section
  sections.push('## Matched Files');
  sections.push('');
  sections.push(`Found ${matchedFiles.size} files matching the search patterns:`);
  sections.push('');

  for (const [filePath, extractedCode] of matchedFiles) {
    sections.push(formatFileSection(filePath, extractedCode));
    sections.push('');
  }

  // Referencing Files section
  if (referencingFiles && referencingFiles.size > 0) {
    sections.push('## Referencing Files');
    sections.push('');
    sections.push(`Found ${referencingFiles.size} files that import the matched files:`);
    sections.push('');

    for (const [filePath, extractedCode] of referencingFiles) {
      sections.push(formatFileSection(filePath, extractedCode));
      sections.push('');
    }
  }

  return sections.join('\n');
}

/**
 * Formats a single file section with its extracted code
 */
function formatFileSection(filePath: string, extractedCode: ExtractedCode): string {
  const lines: string[] = [];
  const fileName = path.basename(filePath);
  const relativePath = getRelativePath(filePath);

  lines.push(`### 📄 ${fileName}`);
  lines.push('');
  lines.push(`**Path:** \`${relativePath}\``);
  lines.push('');

  // Classes
  if (extractedCode.classes.length > 0) {
    lines.push('#### Classes');
    lines.push('');

    for (const cls of extractedCode.classes) {
      lines.push(`##### \`${cls.name}\``);
      lines.push('');

      if (cls.documentation !== undefined) {
        lines.push('**Documentation:**');
        lines.push('```');
        lines.push(cls.documentation);
        lines.push('```');
        lines.push('');
      }

      lines.push('**Signature:**');
      lines.push('```dart');
      lines.push(cls.signature);
      lines.push('```');
      lines.push('');

      if (cls.methods.length > 0) {
        lines.push('**Methods:**');
        lines.push('');

        for (const method of cls.methods) {
          lines.push(`- \`${method.name}\``);

          if (method.documentation !== undefined) {
            lines.push('  ```');
            lines.push('  ' + method.documentation.split('\n').join('\n  '));
            lines.push('  ```');
          }

          lines.push('  ```dart');
          lines.push('  ' + method.signature);
          lines.push('  ```');
          lines.push('');
        }
      }
    }
  }

  // Functions
  if (extractedCode.functions.length > 0) {
    lines.push('#### Functions');
    lines.push('');

    for (const func of extractedCode.functions) {
      lines.push(`##### \`${func.name}\``);
      lines.push('');

      if (func.documentation !== undefined) {
        lines.push('**Documentation:**');
        lines.push('```');
        lines.push(func.documentation);
        lines.push('```');
        lines.push('');
      }

      lines.push('**Signature:**');
      lines.push('```dart');
      lines.push(func.signature);
      lines.push('```');
      lines.push('');
    }
  }

  // If no code was extracted, note that
  if (extractedCode.classes.length === 0 && extractedCode.functions.length === 0) {
    lines.push('*No classes or functions found in this file*');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Gets a relative path for display, removing common prefixes
 */
function getRelativePath(filePath: string): string {
  // Try to find the package name in the path
  const parts = filePath.split(path.sep);

  // Look for common package structure patterns
  const libIndex = parts.lastIndexOf('lib');
  if (libIndex !== -1 && libIndex > 0) {
    // Return from package name onwards
    return parts.slice(libIndex - 1).join('/');
  }

  // Fall back to last 3 parts
  return parts.slice(-3).join('/');
}
