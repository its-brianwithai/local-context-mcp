export interface FetchContextRequest {
  target_directories: string[];
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
  target_directory?: string;
  target_directories?: string[];
  globs?: string[];
  regex?: string[];
  reference_depth?: number;
  generated_at: Date;
  file_paths: string[];
}