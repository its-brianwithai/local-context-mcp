import { promises as fs } from 'fs';
import type { ExtractedCode } from '../types/index.js';

/**
 * Extracts documentation comments preceding a code element
 * Supports /// style (Dart/Rust), JSDoc style (JS/Java), and # style (Python)
 */
function extractDocumentation(lines: string[], startIndex: number): string | undefined {
  const docLines: string[] = [];
  let index = startIndex - 1;

  // Work backwards to collect documentation lines
  while (index >= 0) {
    const line = lines[index];
    if (line === undefined) {
      break;
    }

    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('///')) {
      docLines.unshift(trimmedLine.substring(3).trim());
    } else if (trimmedLine === '' && docLines.length > 0) {
      // Allow empty lines within documentation
      continue;
    } else {
      // Stop when we hit non-documentation
      break;
    }
    index--;
  }

  return docLines.length > 0 ? docLines.join('\n') : undefined;
}

/**
 * Extracts the complete signature including multi-line definitions
 */
function extractCompleteSignature(lines: string[], startIndex: number): string {
  let signature = lines[startIndex] || '';
  let openBraces = 0;
  let openParens = 0;
  let openBrackets = 0;
  let inString = false;
  let stringChar = '';
  let index = startIndex;

  // Count initial braces/parens/brackets
  for (const char of signature) {
    if (!inString) {
      if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
      } else if (char === '{') {
        openBraces++;
      } else if (char === '}') {
        openBraces--;
      } else if (char === '(') {
        openParens++;
      } else if (char === ')') {
        openParens--;
      } else if (char === '[') {
        openBrackets++;
      } else if (char === ']') {
        openBrackets--;
      }
    } else if (char === stringChar && signature[signature.indexOf(char) - 1] !== '\\') {
      inString = false;
    }
  }

  // Continue reading lines until we have balanced braces/parens
  while (
    (openBraces > 0 ||
      openParens > 0 ||
      openBrackets > 0 ||
      inString ||
      signature.trim().endsWith(',') ||
      false ||
      signature.trim().endsWith('=>') ||
      false) &&
    index < lines.length - 1
  ) {
    index++;
    const nextLine = lines[index];
    if (nextLine === undefined || nextLine === '') {
      continue;
    }

    signature += ' ' + nextLine.trim();

    for (const char of nextLine) {
      if (!inString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
        } else if (char === '{') {
          openBraces++;
        } else if (char === '}') {
          openBraces--;
        } else if (char === '(') {
          openParens++;
        } else if (char === ')') {
          openParens--;
        } else if (char === '[') {
          openBrackets++;
        } else if (char === ']') {
          openBrackets--;
        }
      } else if (char === stringChar && nextLine[nextLine.indexOf(char) - 1] !== '\\') {
        inString = false;
      }
    }

    // Stop at implementation start
    if (
      openBraces === 0 &&
      openParens === 0 &&
      openBrackets === 0 &&
      !inString &&
      (nextLine.includes('{') || nextLine.includes(';'))
    ) {
      break;
    }
  }

  return signature.replace(/\s+/g, ' ').trim();
}

/**
 * Extracts class information from Dart code
 */
function extractClasses(content: string): ExtractedCode['classes'] {
  const lines = content.split('\n');
  const classes: ExtractedCode['classes'] = [];

  // Regex patterns for class detection
  const classPattern = /^(abstract\s+)?(class|mixin|enum|extension)\s+(\w+)/;
  const methodPattern =
    /^\s*(static\s+|final\s+|const\s+|late\s+)*([\w<>\[\]?]+\s+)?(get\s+|set\s+)?(\w+)\s*\(/;
  const constructorPattern = /^\s*(\w+)\s*\.\s*(\w+)\s*\(/; // Named constructors
  const getterPattern = /^\s*([\w<>\[\]?]+\s+)?get\s+(\w+)\s*[{=>]/;
  const setterPattern = /^\s*set\s+(\w+)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || line === '') {
      continue;
    }

    const trimmedLine = line.trim();
    const classMatch = trimmedLine.match(classPattern);

    if (classMatch !== null) {
      const className = classMatch[3];
      if (className === undefined) {
        continue;
      }

      const signature = extractCompleteSignature(lines, i);
      const documentation = extractDocumentation(lines, i);
      const methods: ExtractedCode['classes'][0]['methods'] = [];

      // Find the class body
      let braceCount = 0;
      let classStarted = false;
      let j = i;

      // Find opening brace
      while (j < lines.length) {
        const currentLine = lines[j];
        if (currentLine === undefined || currentLine === '') {
          j++;
          continue;
        }

        if (currentLine.includes('{')) {
          classStarted = true;
          braceCount += (currentLine.match(/\{/g) || []).length;
          braceCount -= (currentLine.match(/\}/g) || []).length;
          break;
        }
        j++;
      }

      if (!classStarted) {
        continue;
      }

      // Extract methods within the class
      j++;
      while (j < lines.length && braceCount > 0) {
        const methodLine = lines[j];
        if (methodLine === undefined) {
          j++;
          continue;
        }

        const trimmedMethodLine = methodLine.trim();

        // Update brace count
        braceCount += (methodLine.match(/\{/g) || []).length;
        braceCount -= (methodLine.match(/\}/g) || []).length;

        // Skip empty lines and comments
        if (trimmedMethodLine === '' || trimmedMethodLine.startsWith('//')) {
          j++;
          continue;
        }

        // Check for constructors
        const constructorMatch =
          trimmedMethodLine.match(new RegExp(`^${className}\\s*\\(`)) ||
          trimmedMethodLine.match(constructorPattern);

        if (constructorMatch !== null) {
          const methodSignature = extractCompleteSignature(lines, j);
          const methodDoc = extractDocumentation(lines, j);
          const constructorName = constructorMatch[2] || className;

          methods.push({
            name: constructorName,
            signature: methodSignature,
            documentation: methodDoc,
          });
        }
        // Check for getters
        else if (getterPattern.test(trimmedMethodLine)) {
          const getterMatch = trimmedMethodLine.match(getterPattern);
          if (getterMatch?.[2]) {
            const methodSignature = extractCompleteSignature(lines, j);
            const methodDoc = extractDocumentation(lines, j);

            methods.push({
              name: `get ${getterMatch[2]}`,
              signature: methodSignature,
              documentation: methodDoc,
            });
          }
        }
        // Check for setters
        else if (setterPattern.test(trimmedMethodLine)) {
          const setterMatch = trimmedMethodLine.match(setterPattern);
          if (setterMatch?.[1]) {
            const methodSignature = extractCompleteSignature(lines, j);
            const methodDoc = extractDocumentation(lines, j);

            methods.push({
              name: `set ${setterMatch[1]}`,
              signature: methodSignature,
              documentation: methodDoc,
            });
          }
        }
        // Check for regular methods
        else if (methodPattern.test(trimmedMethodLine)) {
          const methodMatch = trimmedMethodLine.match(methodPattern);
          if (methodMatch?.[4] !== undefined) {
            const methodSignature = extractCompleteSignature(lines, j);
            const methodDoc = extractDocumentation(lines, j);

            methods.push({
              name: methodMatch[4],
              signature: methodSignature,
              documentation: methodDoc,
            });
          }
        }

        j++;
      }

      classes.push({
        name: className,
        signature,
        documentation,
        methods,
      });

      // Skip to end of class
      i = j;
    }
  }

  return classes;
}

/**
 * Extracts top-level functions from Dart code
 */
function extractFunctions(content: string): ExtractedCode['functions'] {
  const lines = content.split('\n');
  const functions: ExtractedCode['functions'] = [];

  // Remove class bodies to avoid extracting methods as functions
  const cleanedLines = removeClassBodies(lines);

  // Regex pattern for function detection
  const functionPattern = /^([\w<>[\]?]+\s+)?(\w+)\s*\(/;

  for (let i = 0; i < cleanedLines.length; i++) {
    const line = cleanedLines[i];
    if (line === undefined || line === '') {
      continue;
    }

    const trimmedLine = line.trim();

    // Skip empty lines, comments, imports, and common keywords
    if (
      trimmedLine === '' ||
      trimmedLine.startsWith('//') ||
      trimmedLine.startsWith('import') ||
      trimmedLine.startsWith('export') ||
      trimmedLine.startsWith('part') ||
      trimmedLine.startsWith('library') ||
      trimmedLine.startsWith('typedef') ||
      trimmedLine.startsWith('const ') ||
      trimmedLine.startsWith('final ') ||
      trimmedLine.startsWith('var ') ||
      trimmedLine.includes('class ') ||
      trimmedLine.includes('enum ') ||
      trimmedLine.includes('mixin ')
    ) {
      continue;
    }

    const functionMatch = trimmedLine.match(functionPattern);

    if (functionMatch?.[2] !== undefined) {
      const functionName = functionMatch[2];

      // Skip common false positives
      if (['if', 'for', 'while', 'switch', 'catch', 'assert'].includes(functionName)) {
        continue;
      }

      const signature = extractCompleteSignature(lines, i);
      const documentation = extractDocumentation(lines, i);

      functions.push({
        name: functionName,
        signature,
        documentation,
      });
    }
  }

  return functions;
}

/**
 * Removes class bodies from lines to prevent extracting methods as functions
 */
function removeClassBodies(lines: string[]): string[] {
  const cleanedLines = [...lines];
  let inClass = false;
  let braceCount = 0;

  for (let i = 0; i < cleanedLines.length; i++) {
    const line = cleanedLines[i];
    if (line === undefined || line === '') {
      continue;
    }

    const trimmedLine = line.trim();

    if (
      !inClass &&
      (trimmedLine.includes('class ') ||
        trimmedLine.includes('enum ') ||
        trimmedLine.includes('mixin ') ||
        trimmedLine.includes('extension '))
    ) {
      inClass = true;
    }

    if (inClass) {
      braceCount += (line.match(/\{/g) ?? []).length;
      braceCount -= (line.match(/\}/g) ?? []).length;

      // Clear the line if we're inside a class
      if (braceCount > 0) {
        cleanedLines[i] = '';
      }

      if (braceCount === 0) {
        inClass = false;
      }
    }
  }

  return cleanedLines;
}

/**
 * Main function to extract code information from a Dart file
 */
export async function extractCodeFromFile(filePath: string): Promise<ExtractedCode> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    const classes = extractClasses(content);
    const functions = extractFunctions(content);

    return {
      filePath,
      classes,
      functions,
    };
  } catch (error) {
    console.error(`Error extracting code from ${filePath}:`, error);
    return {
      filePath,
      classes: [],
      functions: [],
    };
  }
}
