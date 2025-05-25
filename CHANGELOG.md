# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **BREAKING**: Removed `repoBasePath` configuration - now use full absolute paths in `searchableDirectories`
- `searchableDirectories` now accepts full absolute paths instead of relative directory names
- Added support for MCP configuration via `--config` command line argument
- Configuration merging: MCP config takes precedence over config.json
- Improved configuration flexibility with three configuration options:
  1. Direct MCP configuration (recommended)
  2. Traditional config.json file
  3. Hybrid approach (merge both configurations)

### Added
- Support for searching across multiple unrelated directory trees
- Ability to configure server directly in Claude Desktop config without separate config.json
- Enhanced documentation for all configuration methods

## [0.1.0] - 2025-01-25

### Added
- Initial release of Local Context MCP Server
- Core functionality for analyzing local files and folders
- Pattern matching with glob and regex support
- Multi-language code extraction (Dart, JavaScript, TypeScript, Python, Java, etc.)
- Reference tracking to find importing files
- Intelligent caching with file modification tracking
- MCP server implementation for Claude Desktop integration
- Configurable base path for repository scanning
- Comprehensive markdown output formatting
- JSON-based configuration system
- `searchableDirectories` configuration for defining which directories can be searched
- `search_terms` parameter for finding relevant directories across the configured workspace
- `update-config` tool for dynamic configuration management (CRUD operations)
- `list-tools` command to display available tools with detailed documentation
- Enhanced tool descriptions with comprehensive parameter documentation and examples
- ESLint and Prettier configuration for code quality and formatting
- TypeScript strict mode compliance with comprehensive type safety