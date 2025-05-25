import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export interface UpdateConfigRequest {
  operation: 'get' | 'set' | 'delete' | 'add' | 'remove';
  key?: string;
  value?: any;
  array_item?: any;
}

/**
 * Updates the configuration file
 */
export async function updateConfig(request: UpdateConfigRequest): Promise<string> {
  const configPath = resolve(process.cwd(), 'config.json');
  
  try {
    // Read current config
    let config: any;
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      config = JSON.parse(configContent);
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
          const keys = request.key.split('.');
          let value = config;
          for (const k of keys) {
            value = value?.[k];
          }
          return JSON.stringify(value ?? null, null, 2);
        }
        return JSON.stringify(config, null, 2);
        
      case 'set':
        if (!request.key) {
          throw new Error('Key is required for set operation');
        }
        const setKeys = request.key.split('.');
        let current = config;
        for (let i = 0; i < setKeys.length - 1; i++) {
          const k = setKeys[i]!;
          if (!(k in current) || typeof current[k] !== 'object') {
            current[k] = {};
          }
          current = current[k];
        }
        current[setKeys[setKeys.length - 1]!] = request.value;
        needsWrite = true;
        break;
        
      case 'delete':
        if (!request.key) {
          throw new Error('Key is required for delete operation');
        }
        const deleteKeys = request.key.split('.');
        let parent = config;
        for (let i = 0; i < deleteKeys.length - 1; i++) {
          const k = deleteKeys[i]!;
          if (!(k in parent)) {
            return `Key "${request.key}" not found`;
          }
          parent = parent[k];
        }
        delete parent[deleteKeys[deleteKeys.length - 1]!];
        needsWrite = true;
        break;
        
      case 'add':
        if (!request.key) {
          throw new Error('Key is required for add operation');
        }
        const addKeys = request.key.split('.');
        let arrayParent = config;
        for (const k of addKeys) {
          if (!(k in arrayParent)) {
            arrayParent[k] = [];
          }
          arrayParent = arrayParent[k];
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
        let removeArrayParent = config;
        for (const k of removeKeys) {
          if (!(k in removeArrayParent)) {
            return `Key "${request.key}" not found`;
          }
          removeArrayParent = removeArrayParent[k];
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