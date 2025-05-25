export interface FetchContextRequest {
  search_terms: string[];
  globs?: string[];
  regex?: string[];
  reference_depth?: number;
}

export interface ExtractedCode {
  filePath: string;
  classes: Array<{
    name: string;
    signature: string;
    documentation?: string;
    methods: Array<{
      name: string;
      signature: string;
      documentation?: string;
    }>;
  }>;
  functions: Array<{
    name: string;
    signature: string;
    documentation?: string;
  }>;
}

export interface CacheEntry {
  hash: string;
  search_terms?: string[];
  target_directory?: string; // Legacy support
  target_directories?: string[]; // Legacy support
  globs?: string[];
  regex?: string[];
  reference_depth?: number;
  generated_at: Date;
  file_paths: string[];
}
