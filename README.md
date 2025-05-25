# Local Context MCP Server

A Model Context Protocol (MCP) server that provides intelligent analysis of local files and folders. It allows AI agents to efficiently query and understand file structures, code patterns, and relationships within any local repository or directory structure.

## 🚀 Features

- **Smart Pattern Matching**: Search files using glob patterns (like `find`) and regex patterns (like `grep`)
- **Code Extraction**: Programmatically extract classes, methods, signatures, and documentation from various programming languages
- **Reference Tracking**: Find files that import/reference matched files (configurable depth)
- **Intelligent Caching**: Cache results with file modification time tracking
- **Configurable Paths**: Analyze any local directory structure
- **Multiple Language Support**: Works with Dart, JavaScript, TypeScript, Python, Java, and more

## 📚 Available Tools

### fetch-context

Searches for terms across configured directories and extracts comprehensive context about matching files and code structure.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search_terms` | string[] | ✅ | Array of search terms to find across all configured directories (case-insensitive) |
| `globs` | string[] | ❌ | Array of glob patterns to match files (e.g., `["**/*.js", "src/**/*.ts"]`) |
| `regex` | string[] | ❌ | Array of regex patterns to search within files (e.g., `["class.*Controller", "function\\s+\\w+"]`) |
| `reference_depth` | number | ❌ | Maximum depth for tracking file references (-1 for unlimited, default: -1) |

### update-config

Performs CRUD operations on the config.json file. This tool allows you to dynamically manage all configuration options.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operation` | string | ✅ | Operation to perform: 'get', 'set', 'delete', 'add', or 'remove' |
| `key` | string | ❌ | Dot-separated path to the config value (e.g., "searchableDirectories" or "cacheDir") |
| `value` | any | ❌ | Value to set (for 'set' operation) |
| `array_item` | any | ❌ | Item to add/remove from array (for 'add'/'remove' operations) |

**Available Configuration Options:**

- `searchableDirectories` (string[], required): Array of full absolute paths to directories that can be searched
  - Example: `["/Users/john/projects/my-app", "/opt/shared/libraries", "/home/john/work/client-project"]`
  - Each path must be a complete, absolute file system path
  - Supports multiple unrelated directory trees
- `cacheDir` (string, optional): Directory for storing cached analysis results
  - Default: `./mcp-cache`
  - Example: `/tmp/mcp-cache` or `./cache`

**Advanced Configuration (can be added via update-config):**

- Custom arrays for project organization
- Nested configuration objects for different environments
- Any JSON-compatible data structure

### list-tools

Shows detailed information about all available tools, their parameters, and usage examples.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| None | - | - | This tool requires no parameters |

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn

## 🛠️ Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/its-brianwithai/local-context-mcp.git
   cd local-context-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Copy `config.example.json` to `config.json` and configure:
   ```bash
   cp config.example.json config.json
   ```
   
   Edit `config.json` to set your searchable directories with full absolute paths:
   ```json
   {
     "searchableDirectories": [
       "/Users/john/projects/my-app",
       "/Users/john/work/client-project",
       "/opt/shared/libraries/common-utils",
       "/home/john/experiments/ai-research"
     ],
     "cacheDir": "./mcp-cache"
   }
   ```

## 🔧 Configuration

### Configuration File

The `config.json` file contains:

- `searchableDirectories`: Array of full absolute paths to directories that can be searched (required)
- `cacheDir`: Directory for caching analysis results (default: `./mcp-cache`)

### Claude Desktop Integration

You can configure the server in two ways:

#### Option 1: Direct MCP Configuration (Recommended)

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "local-context": {
      "command": "node",
      "args": [
        "/path/to/local-context-mcp/dist/index.js",
        "--config={\"searchableDirectories\":[\"/Users/john/projects/my-app\",\"/Users/john/work/client-project\",\"/opt/shared/libraries\"],\"cacheDir\":\"/tmp/mcp-cache\"}"
      ]
    }
  }
}
```

For better readability, you can format it across multiple lines (most JSON parsers support this):

```json
{
  "mcpServers": {
    "local-context": {
      "command": "node",
      "args": [
        "/path/to/local-context-mcp/dist/index.js",
        "--config={
          \"searchableDirectories\": [
            \"/Users/john/projects/my-app\",
            \"/Users/john/work/client-project\",
            \"/opt/shared/libraries/common-utils\",
            \"/home/john/experiments/ai-research\"
          ],
          \"cacheDir\": \"./mcp-cache\"
        }"
      ]
    }
  }
}
```

#### Option 2: Using config.json File

If you prefer to use a separate configuration file, add this to Claude Desktop config:

```json
{
  "mcpServers": {
    "local-context": {
      "command": "node",
      "args": ["/path/to/local-context-mcp/dist/index.js"]
    }
  }
}
```

Then create a `config.json` file in the project directory with your directories.

#### Option 3: Hybrid Configuration (Best of Both)

You can combine both methods - use `config.json` for base directories and override/extend via MCP:

**config.json:**
```json
{
  "searchableDirectories": [
    "/Users/john/projects/default-project",
    "/Users/john/work/base-libraries"
  ],
  "cacheDir": "./mcp-cache"
}
```

**Claude Desktop config:**
```json
{
  "mcpServers": {
    "local-context": {
      "command": "node",
      "args": [
        "/path/to/local-context-mcp/dist/index.js",
        "--config={\"searchableDirectories\":[\"/Users/john/temp/current-task\",\"/Users/john/projects/default-project\",\"/Users/john/work/base-libraries\"]}"
      ]
    }
  }
}
```

Note: MCP configuration takes precedence when there are conflicts.

### Agent System Prompt

Add this snippet to your agent's system prompt to help it understand when to use the local-context-mcp tool:

```markdown
You have access to the local-context-mcp tool for analyzing local codebases. Use fetch-context to search and understand code structure, find patterns across files, trace dependencies, and extract documentation about: **{subject}**. Provide search_terms (required) to find relevant directories, and optionally globs for file patterns, regex for content search, and reference_depth for import tracing.
```

Customize the `{subject}` placeholder with your specific use case:

```yaml
subject: All Flutter packages and Dart libraries in the monorepo
```

## 📖 Usage

### Running the Server

Start the MCP server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### Example Prompts

When using with Claude:

**fetch-context examples:**
- "Use fetch-context to search for 'auth' across all configured directories and show me how authentication works"
- "Find all React components by searching for 'component' with globs ['**/*.jsx', '**/*.tsx']"
- "Search for 'config' to find all configuration files and their usage patterns"
- "Look for 'database' or 'db' to understand the data layer implementation"

**update-config examples:**
- "Use update-config to get the current configuration"
- "Add '/Users/john/new-project' to searchableDirectories using update-config"
- "Remove '/Users/john/old-project' from searchableDirectories in the configuration"
- "Set the cacheDir to '/tmp/mcp-cache' using update-config"

**list-tools examples:**
- "Use list-tools to show me all available tools and how to use them"
- "What tools are available in this MCP server?"
- "Show me the documentation for all tools"

## 🏗️ Architecture

### How It Works

1. **Pattern Matching**: Finds files matching glob patterns and/or containing regex patterns
2. **Code Extraction**: Extracts from matched files:
   - Class names and signatures (including inheritance)
   - Method signatures and names
   - Documentation comments (various styles: ///, /**, #)
   - Top-level functions
3. **Reference Tracking**: Finds all files that import the matched files (configurable depth)
4. **Markdown Generation**: Combines everything into comprehensive markdown including:
   - Directory README (if present)
   - Extracted code structure from matched files
   - Code structure from referencing files
5. **Caching**: Results cached with file modification times, automatically invalidating when files change

### Project Structure

```
local-context-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server implementation
│   ├── config.ts             # Configuration management
│   ├── tools/
│   │   └── fetchContext.ts   # Main tool implementation
│   ├── utils/
│   │   ├── patternMatcher.ts # File pattern matching
│   │   ├── codeExtractor.ts  # Multi-language code extraction
│   │   ├── referenceTracker.ts # Import/reference tracking
│   │   ├── markdownBuilder.ts # Output formatting
│   │   └── cacheManager.ts   # Cache management
│   └── types/
│       └── index.ts          # TypeScript type definitions
├── dist/                     # Compiled JavaScript
└── mcp-cache/                # Generated cache files
```

## 🧪 Development

### Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm run dev` - Run in development mode with auto-reload
- `npm start` - Run the compiled server
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Run ESLint and automatically fix issues
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking without building
- `npm test` - Run tests (not yet implemented)

### Testing

Manual testing scripts are available:
- `test-server.js` - Test server functionality
- `test-cache.js` - Test caching behavior
- `test-references.js` - Test reference tracking

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for use with [Claude](https://claude.ai) and the [Model Context Protocol](https://modelcontextprotocol.io)
- Supports analysis of projects in multiple programming languages

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.