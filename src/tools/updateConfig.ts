import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export interface UpdateConfigRequest {
  operation: 'get' | 'set' | 'delete' | 'add' | 'remove';
  key?: string;
  value?: unknown;
  array_item?: unknown;
}

/**
 * Safely gets a value from a nested object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Updates the configuration file
 */
export async function updateConfig(request: UpdateConfigRequest): Promise<string> {
  const configPath = resolve(process.cwd(), 'config.json');

  try {
    // Read current config
    let config: Record<string, unknown>;
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      config = JSON.parse(configContent) as Record<string, unknown>;
    } catch (error) {
      if (request.operation === 'get') {
        return '{}';
      }
      // For other operations, start with empty config
      config = {};
    }

    let needsWrite = false;

    switch (request.operation) {
      case 'get':
        if (request.key) {
          const value = getNestedValue(config, request.key);
          return JSON.stringify(value ?? null, null, 2);
        }
        return JSON.stringify(config, null, 2);

      case 'set':
        if (!request.key) {
          throw new Error('Key is required for set operation');
        }
        const setKeys = request.key.split('.');
        let current: Record<string, unknown> = config;
        for (let i = 0; i < setKeys.length - 1; i++) {
          const k = setKeys[i]!;
          if (!(k in current) || typeof current[k] !== 'object' || current[k] === null) {
            current[k] = {};
          }
          current = current[k] as Record<string, unknown>;
        }
        current[setKeys[setKeys.length - 1]!] = request.value;
        needsWrite = true;
        break;

      case 'delete':
        if (!request.key) {
          throw new Error('Key is required for delete operation');
        }
        const deleteKeys = request.key.split('.');
        let parent: Record<string, unknown> = config;
        for (let i = 0; i < deleteKeys.length - 1; i++) {
          const k = deleteKeys[i]!;
          if (!(k in parent)) {
            return `Key "${request.key}" not found`;
          }
          const next = parent[k];
          if (typeof next !== 'object' || next === null) {
            return `Key "${request.key}" not found`;
          }
          parent = next as Record<string, unknown>;
        }
        delete parent[deleteKeys[deleteKeys.length - 1]!];
        needsWrite = true;
        break;

      case 'add':
        if (!request.key) {
          throw new Error('Key is required for add operation');
        }
        const addKeys = request.key.split('.');
        let arrayParent: unknown = config;
        for (const k of addKeys) {
          if (typeof arrayParent !== 'object' || arrayParent === null) {
            throw new Error(`Cannot access key "${request.key}"`);
          }
          const objParent = arrayParent as Record<string, unknown>;
          if (!(k in objParent)) {
            objParent[k] = [];
          }
          arrayParent = objParent[k];
        }
        if (!Array.isArray(arrayParent)) {
          throw new Error(`Key "${request.key}" is not an array`);
        }
        arrayParent.push(request.array_item ?? request.value);
        needsWrite = true;
        break;

      case 'remove':
        if (!request.key) {
          throw new Error('Key is required for remove operation');
        }
        const removeKeys = request.key.split('.');
        let removeArrayParent: unknown = config;
        for (const k of removeKeys) {
          if (typeof removeArrayParent !== 'object' || removeArrayParent === null) {
            return `Key "${request.key}" not found`;
          }
          const objParent = removeArrayParent as Record<string, unknown>;
          if (!(k in objParent)) {
            return `Key "${request.key}" not found`;
          }
          removeArrayParent = objParent[k];
        }
        if (!Array.isArray(removeArrayParent)) {
          throw new Error(`Key "${request.key}" is not an array`);
        }
        const index = removeArrayParent.indexOf(request.array_item ?? request.value);
        if (index > -1) {
          removeArrayParent.splice(index, 1);
          needsWrite = true;
        } else {
          return `Item not found in array at "${request.key}"`;
        }
        break;

      default:
        throw new Error(`Unknown operation: ${request.operation}`);
    }

    // Write updated config if needed
    if (needsWrite) {
      writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
      return `Configuration updated successfully. New config:\n${JSON.stringify(config, null, 2)}`;
    }

    return JSON.stringify(config, null, 2);
  } catch (error) {
    return `Error updating configuration: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
