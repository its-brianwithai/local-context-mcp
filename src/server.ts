import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config.js';
import { z } from 'zod';
import { fetchContext } from './tools/fetchContext.js';
import { updateConfig } from './tools/updateConfig.js';

// Tool input schema
const FetchContextSchema = z.object({
  target_directories: z.array(z.string()).describe('Names of directories to analyze within the repository base path'),
  globs: z.array(z.string()).optional().describe('Glob patterns to match files (e.g., ["**/*.dart", "lib/**/*_widget.dart"])'),
  regex: z.array(z.string()).optional().describe('Regex patterns to search within files (e.g., ["class.*Widget", "extends\\\\s+StatefulWidget"])'),
  reference_depth: z.number().default(-1).describe('Maximum depth for tracking file references (-1 for unlimited, default: -1)')
});

type FetchContextInput = z.infer<typeof FetchContextSchema>;

// Update config schema
const UpdateConfigSchema = z.object({
  operation: z.enum(['get', 'set', 'delete', 'add', 'remove']).describe('Operation to perform on the config'),
  key: z.string().optional().describe('Dot-separated path to the config value (e.g., "repoBasePath" or "nested.key")'),
  value: z.any().optional().describe('Value to set (for set operation)'),
  array_item: z.any().optional().describe('Item to add/remove from array (for add/remove operations)')
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
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle tool list requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'fetch-context',
          description: 'Fetch comprehensive context about files and folders in a directory',
          inputSchema: {
            type: 'object',
            properties: {
              target_directories: {
                type: 'array',
                items: { type: 'string' },
                description: 'Names of directories to analyze within the repository base path'
              },
              globs: {
                type: 'array',
                items: { type: 'string' },
                description: 'Glob patterns to match files (e.g., ["**/*.dart", "lib/**/*_widget.dart"])'
              },
              regex: {
                type: 'array',
                items: { type: 'string' },
                description: 'Regex patterns to search within files (e.g., ["class.*Widget", "extends\\\\s+StatefulWidget"])'
              },
              reference_depth: {
                type: 'number',
                description: 'Maximum depth for tracking file references (-1 for unlimited, default: -1)',
                default: -1
              }
            },
            required: ['target_directories']
          }
        },
        {
          name: 'update-config',
          description: 'Update the configuration file (config.json) with CRUD operations',
          inputSchema: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                enum: ['get', 'set', 'delete', 'add', 'remove'],
                description: 'Operation to perform on the config'
              },
              key: {
                type: 'string',
                description: 'Dot-separated path to the config value (e.g., "repoBasePath" or "nested.key")'
              },
              value: {
                description: 'Value to set (for set operation)'
              },
              array_item: {
                description: 'Item to add/remove from array (for add/remove operations)'
              }
            },
            required: ['operation']
          }
        }
      ]
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
                text: explanation
              }
            ]
          };
        }
        
        case 'update-config': {
          const input = UpdateConfigSchema.parse(args);
          const result = await updateConfig(input);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
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

**Directories:** ${input.target_directories.join(', ')}

**Error:** ${errorMessage}

## Debug Information
- Repository Base Path: ${this.config.repoBasePath}
- Cache Directory: ${this.config.cacheDir}
- Request: ${JSON.stringify(input, null, 2)}`;
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Local Context MCP server running on stdio');
  }
}