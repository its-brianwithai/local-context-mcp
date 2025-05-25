import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config.js';
import { z } from 'zod';
import { fetchContext } from './tools/fetchContext.js';
import { updateConfig } from './tools/updateConfig.js';

// Tool input schema
const FetchContextSchema = z.object({
  search_terms: z
    .array(z.string())
    .describe(
      'Search terms to find across all configured directories (e.g., ["auth", "user", "login"])'
    ),
  globs: z
    .array(z.string())
    .optional()
    .describe('Glob patterns to match files (e.g., ["**/*.dart", "lib/**/*_widget.dart"])'),
  regex: z
    .array(z.string())
    .optional()
    .describe(
      'Regex patterns to search within files (e.g., ["class.*Widget", "extends\\\\s+StatefulWidget"])'
    ),
  reference_depth: z
    .number()
    .default(-1)
    .describe('Maximum depth for tracking file references (-1 for unlimited, default: -1)'),
});

type FetchContextInput = z.infer<typeof FetchContextSchema>;

// Update config schema
const UpdateConfigSchema = z.object({
  operation: z
    .enum(['get', 'set', 'delete', 'add', 'remove'])
    .describe('Operation to perform on the config'),
  key: z
    .string()
    .optional()
    .describe('Dot-separated path to the config value (e.g., "repoBasePath" or "nested.key")'),
  value: z.any().optional().describe('Value to set (for set operation)'),
  array_item: z
    .any()
    .optional()
    .describe('Item to add/remove from array (for add/remove operations)'),
});

// type UpdateConfigInput = z.infer<typeof UpdateConfigSchema>;

export class LocalRepoScannerServer {
  private server: Server;
  private config: ReturnType<typeof loadConfig>;

  constructor() {
    this.config = loadConfig();
    this.server = new Server(
      {
        name: 'local-context-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle tool list requests
    this.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: [
        {
          name: 'fetch-context',
          description:
            'Searches for terms across all configured directories to extract comprehensive context about matching files, code structure, and relationships. Returns markdown-formatted documentation including file contents, code patterns, class/method signatures, and import relationships.',
          inputSchema: {
            type: 'object',
            properties: {
              search_terms: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Search terms to find across all configured searchableDirectories. Files/directories containing these terms in their path or name will be included. Example: ["auth", "user", "login"]. The search is case-insensitive and matches partial paths.',
              },
              globs: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Optional glob patterns to filter files within matched directories. Uses standard glob syntax. Examples: ["**/*.ts"] for all TypeScript files, ["src/**/*.js", "!**/*.test.js"] to include JS files but exclude tests. If not provided, all files are considered.',
              },
              regex: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Optional regex patterns to search for specific content within files. Only files containing matches will be included. Examples: ["class.*Controller"] to find controller classes, ["TODO|FIXME"] to find TODOs. Supports full JavaScript regex syntax.',
              },
              reference_depth: {
                type: 'number',
                description:
                  'Controls how many levels of file imports/references to trace. Use -1 for unlimited depth (traces all imports recursively), 0 to skip reference tracking, or any positive number to limit depth. Default: -1. Higher values provide more context but may include many files.',
                default: -1,
              },
            },
            required: ['search_terms'],
          },
        },
        {
          name: 'update-config',
          description:
            'Performs CRUD operations on the config.json file. Supports getting, setting, deleting values, and manipulating arrays. Changes are immediately saved to disk.',
          inputSchema: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                enum: ['get', 'set', 'delete', 'add', 'remove'],
                description:
                  'The operation to perform. "get" retrieves a value or entire config, "set" creates/updates a value, "delete" removes a key, "add" appends to an array, "remove" removes from an array.',
              },
              key: {
                type: 'string',
                description:
                  'Dot-notation path to the config value. Examples: "repoBasePath" for top-level, "cache.ttl" for nested, "directories.0" for array index. Leave empty for "get" to retrieve entire config.',
              },
              value: {
                description:
                  'The value to set (required for "set" operation). Can be any valid JSON type: string, number, boolean, object, or array. Example: "/home/user/projects" or {"timeout": 5000}',
              },
              array_item: {
                description:
                  'The item to add/remove from an array (required for "add"/"remove" operations). For "add", the item is appended. For "remove", the first matching item is removed. Example: "new-directory"',
              },
            },
            required: ['operation'],
          },
        },
        {
          name: 'list-tools',
          description:
            'Lists all available tools with their detailed descriptions and parameter information. Useful for understanding what operations are available and how to use them.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const args = request.params.arguments as unknown;

      switch (request.params.name) {
        case 'fetch-context': {
          const input = FetchContextSchema.parse(args);
          const explanation = await this.fetchContext(input);
          return {
            content: [
              {
                type: 'text',
                text: explanation,
              },
            ],
          };
        }

        case 'update-config': {
          const input = UpdateConfigSchema.parse(args);
          const result = await updateConfig(input);
          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        }

        case 'list-tools': {
          const toolsList = this.getToolsList();
          return {
            content: [
              {
                type: 'text',
                text: toolsList,
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  private async fetchContext(input: FetchContextInput): Promise<string> {
    try {
      return await fetchContext(input, this.config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `# Error analyzing package

**Search Terms:** ${input.search_terms.join(', ')}

**Error:** ${errorMessage}

## Debug Information
- Repository Base Path: ${this.config.repoBasePath}
- Cache Directory: ${this.config.cacheDir}
- Request: ${JSON.stringify(input, null, 2)}`;
    }
  }

  private getToolsList(): string {
    return `# Available Tools for Local Context MCP

## 1. fetch-context
**Purpose:** Searches for terms across all configured directories to extract comprehensive context about matching files, code structure, and relationships.

**Parameters:**
- **search_terms** (required, array): Terms to search for across all configured directories
  - Example: ["auth", "user", "login"]
  - Matches against file/directory paths (case-insensitive)
- **globs** (optional, array): File patterns to match
  - Example: ["**/*.ts", "!**/*.test.ts"]
- **regex** (optional, array): Content patterns to search for
  - Example: ["class.*Controller", "TODO|FIXME"]
- **reference_depth** (optional, number): How deep to trace file imports
  - Default: -1 (unlimited)
  - Use 0 to skip reference tracking

**Example Usage:**
\`\`\`json
{
  "search_terms": ["authentication", "oauth"],
  "globs": ["**/*.js", "**/*.ts"],
  "regex": ["import.*from.*@auth"],
  "reference_depth": 2
}
\`\`\`

## 2. update-config
**Purpose:** Manages the config.json file with CRUD operations.

**Parameters:**
- **operation** (required, string): One of: get, set, delete, add, remove
- **key** (optional, string): Dot-notation path to config value
  - Example: "cache.ttl" or "directories.0"
- **value** (optional, any): Value for "set" operation
- **array_item** (optional, any): Item for "add"/"remove" operations

**Example Usage:**
\`\`\`json
// Get entire config
{ "operation": "get" }

// Set a value
{ "operation": "set", "key": "repoBasePath", "value": "/home/projects" }

// Add to array
{ "operation": "add", "key": "customDirs", "array_item": "new-dir" }
\`\`\`

## 3. list-tools
**Purpose:** Shows this help text with all available tools and their usage.

**Parameters:** None

**Configuration:**
Current configuration can be viewed with: \`{"operation": "get"}\` using update-config tool.
Base repository path: ${this.config.repoBasePath}
Cache directory: ${this.config.cacheDir}`;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Local Context MCP server running on stdio');
  }
}
