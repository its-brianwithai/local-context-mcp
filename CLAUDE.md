# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build and Development
- `npm install` - Install dependencies
- `npm run build` - Build the TypeScript project to dist/
- `npm run dev` - Run in development mode with auto-reload
- `npm start` - Start the compiled server

### Testing
- Manual testing scripts available: `test-server.js`, `test-cache.js`, `test-references.js`
- No formal test suite configured yet

### Configuration
Copy `config.example.json` to `config.json` and configure:
```json
{
  "repoBasePath": "/path/to/your/repositories",
  "cacheDir": "./mcp-cache"
}
```

## Architecture

This is a Model Context Protocol (MCP) server that analyzes local files and folders. Key architectural decisions:

### Core Flow
1. **MCP Server** (`server.ts`) - Handles MCP protocol communication via stdio
2. **fetch-context Tool** - Single exposed tool that accepts directory name, glob patterns, and regex patterns
3. **Pattern Matching** → **Code Extraction** → **Reference Tracking** → **Markdown Generation**
4. **Caching Layer** - Results cached with file modification time tracking

### Key Components
- **Pattern Matcher** (`utils/patternMatcher.ts`) - Finds files using glob patterns and regex content search
- **Code Extractor** (`utils/codeExtractor.ts`) - Extracts code structure from multiple languages (classes, methods, docs)
- **Reference Tracker** (`utils/referenceTracker.ts`) - Tracks import relationships between files
- **Markdown Builder** (`utils/markdownBuilder.ts`) - Formats results as comprehensive markdown
- **Cache Manager** (`utils/cacheManager.ts`) - File-based caching with automatic invalidation

### TypeScript Configuration
- ES2022 modules with strict mode enabled
- All array access is checked (`noUncheckedIndexedAccess: true`)
- Unused variables/parameters cause errors
- Source maps enabled for debugging

### MCP Integration
The server integrates with Claude Desktop via `claude_desktop_config.json`. It provides context about local codebases by analyzing their structure and usage patterns.