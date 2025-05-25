# Local Context MCP Server

A Model Context Protocol (MCP) server that provides intelligent analysis of local files and folders. It allows AI agents to efficiently query and understand file structures, code patterns, and relationships within any local repository or directory structure.

## 🚀 Features

- **Smart Pattern Matching**: Search files using glob patterns (like `find`) and regex patterns (like `grep`)
- **Code Extraction**: Programmatically extract classes, methods, signatures, and documentation from various programming languages
- **Reference Tracking**: Find files that import/reference matched files (configurable depth)
- **Intelligent Caching**: Cache results with file modification time tracking
- **Configurable Paths**: Analyze any local directory structure
- **Multiple Language Support**: Works with Dart, JavaScript, TypeScript, Python, Java, and more

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn

## 🛠️ Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/local-context-mcp.git
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
   
   Edit `config.json` to set your repository path:
   ```json
   {
     "repoBasePath": "/path/to/your/repositories",
     "cacheDir": "./mcp-cache"
   }
   ```

## 🔧 Configuration

### Configuration File

The `config.json` file contains:

- `repoBasePath`: The base directory containing your repositories/projects (required)
- `cacheDir`: Directory for caching analysis results (default: `./mcp-cache`)

### Claude Desktop Integration

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

### Tools

#### fetch-context

Analyzes directories and extracts comprehensive context about files and code structure.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `target_directories` | string[] | ✅ | Array of directory names to analyze within the repository base path |
| `globs` | string[] | ❌ | Array of glob patterns to match files (e.g., `["**/*.js", "src/**/*.ts"]`) |
| `regex` | string[] | ❌ | Array of regex patterns to search within files (e.g., `["class.*Controller", "function\\s+\\w+"]`) |
| `reference_depth` | number | ❌ | Maximum depth for tracking file references (-1 for unlimited, default: -1) |

#### update-config

Performs CRUD operations on the config.json file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operation` | string | ✅ | Operation to perform: 'get', 'set', 'delete', 'add', or 'remove' |
| `key` | string | ❌ | Dot-separated path to the config value (e.g., "repoBasePath" or "nested.key") |
| `value` | any | ❌ | Value to set (for 'set' operation) |
| `array_item` | any | ❌ | Item to add/remove from array (for 'add'/'remove' operations) |

### Example Prompts

When using with Claude:

**fetch-context examples:**
- "Use the fetch-context tool to analyze the 'myproject' directory, looking for all classes that extend BaseController"
- "Show me how the authentication system works by finding all files with 'auth' in their name across both 'frontend' and 'backend' directories"
- "Find all configuration files and their usage patterns in the 'backend' and 'shared' directories"
- "Analyze multiple microservices at once by searching in ['service-a', 'service-b', 'service-c'] directories"

**update-config examples:**
- "Use update-config to get the current configuration"
- "Set the repoBasePath to '/home/user/projects' using update-config"
- "Add 'new-project' to a custom directories array in the config"
- "Remove the cacheDir setting from the configuration"

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