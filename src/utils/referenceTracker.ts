import { promises as fs } from 'fs';
import * as path from 'path';

interface FileReference {
  file: string;
  imports: string[];
  depth: number;
}

/**
 * Extracts import statements from a file
 */
async function extractImports(filePath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const imports: string[] = [];

    // Match import statements
    const importRegex = /^import\s+['"]([^'"]+)['"]/gm;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath !== undefined) {
        imports.push(importPath);
      }
    }

    return imports;
  } catch (error) {
    console.error(`Could not read imports from ${filePath}:`, error);
    return [];
  }
}

/**
 * Resolves an import path to an absolute file path
 */
async function resolveImportPath(
  importPath: string,
  currentFile: string,
  projectRoot: string
): Promise<string | null> {
  // Handle module imports (e.g., package:module_name/... for Dart)
  if (importPath.startsWith('package:')) {
    const parts = importPath.substring(8).split('/');
    const moduleName = parts[0];
    const filePath = parts.slice(1).join('/');

    // Check if it's importing from the current module
    const currentModule = path.basename(path.dirname(path.dirname(currentFile)));
    if (moduleName === currentModule) {
      return path.join(projectRoot, moduleName, 'lib', filePath);
    }

    // For external modules, we can't resolve them in local files
    return null;
  }

  // Handle relative imports
  if (importPath.startsWith('.')) {
    const dir = path.dirname(currentFile);
    return path.resolve(dir, importPath);
  }

  // Handle absolute imports from lib/
  if (!importPath.startsWith('/')) {
    // Find the project root (directory containing pubspec.yaml or package.json)
    let currentDir = path.dirname(currentFile);
    let packageDir = null;

    while (currentDir !== path.dirname(currentDir)) {
      try {
        const pubspecPath = path.join(currentDir, 'pubspec.yaml');
        const pubspecExists = await fs
          .access(pubspecPath)
          .then(() => true)
          .catch(() => false);
        if (pubspecExists) {
          packageDir = currentDir;
          break;
        }
      } catch {
        // Continue searching
      }
      currentDir = path.dirname(currentDir);
    }

    if (packageDir !== null) {
      return path.join(packageDir, 'lib', importPath);
    }
  }

  return null;
}

/**
 * Finds all files that reference the given files
 */
export async function findReferencingFiles(
  targetFiles: string[],
  projectRoot: string,
  maxDepth: number = -1
): Promise<Map<string, FileReference>> {
  const references = new Map<string, FileReference>();
  const processed = new Set<string>();
  // const toProcess: FileReference[] = [];

  // Initialize with target files at depth 0
  for (const file of targetFiles) {
    references.set(file, { file, imports: [], depth: 0 });
    processed.add(file);
  }

  // Start searching from depth 1
  let currentDepth = 1;

  while (maxDepth === -1 || currentDepth <= maxDepth) {
    const filesToSearch = await findAllSourceFiles(projectRoot);
    const foundAtThisDepth: FileReference[] = [];

    // Check each file to see if it imports any of our tracked files
    for (const file of filesToSearch) {
      if (processed.has(file)) {
        continue;
      }

      const imports = await extractImports(file);
      const importedTrackedFiles: string[] = [];

      for (const importPath of imports) {
        const resolvedPath = await resolveImportPath(importPath, file, projectRoot);

        if (resolvedPath !== null && references.has(resolvedPath)) {
          importedTrackedFiles.push(resolvedPath);
        }
      }

      if (importedTrackedFiles.length > 0) {
        const ref: FileReference = {
          file,
          imports: importedTrackedFiles,
          depth: currentDepth,
        };

        references.set(file, ref);
        processed.add(file);
        foundAtThisDepth.push(ref);
      }
    }

    // If no new files found at this depth, we're done
    if (foundAtThisDepth.length === 0) {
      break;
    }

    // Prepare for next depth
    currentDepth++;
  }

  return references;
}

/**
 * Checks if a file is a source file
 */
function isSourceFile(filename: string): boolean {
  const sourceExtensions = [
    '.dart',
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.py',
    '.java',
    '.kt',
    '.swift',
    '.go',
    '.rs',
    '.rb',
    '.php',
    '.cpp',
    '.c',
    '.h',
    '.cs',
  ];
  return sourceExtensions.some((ext) => filename.endsWith(ext));
}

/**
 * Finds all source files in a directory recursively
 */
async function findAllSourceFiles(dir: string): Promise<string[]> {
  const sourceFiles: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip hidden directories and common non-source directories
          if (
            !entry.name.startsWith('.') &&
            entry.name !== 'node_modules' &&
            entry.name !== 'build' &&
            entry.name !== '.dart_tool'
          ) {
            await walk(fullPath);
          }
        } else if (entry.isFile() && isSourceFile(entry.name)) {
          sourceFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Could not read directory ${currentDir}:`, error);
    }
  }

  await walk(dir);
  return sourceFiles;
}
