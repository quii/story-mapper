export interface StoryMap {
  title: string | null;
  releases: Release[];   // top-level, ordered list of release lines
  activities: Activity[];
}

/** A release line: appears after `tier` rows of stories (1-indexed). */
export interface Release {
  id: string;
  name: string | null;
  tier: number; // 1-indexed: release appears after tier N's story rows
}

export interface Activity {
  id: string;
  name: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  name: string;
  stories: StoryItem[];  // flat ordered list — no more inline release separators
}

export interface StoryItem {
  id: string;
  type: 'story';
  text: string;
}

// Keep ReleaseItem only for backwards-compat parsing of old --- syntax
export interface ReleaseItem {
  id: string;
  type: 'release';
  name: string | null;
}

export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  line: number; // 1-indexed
  message: string;
  suggestion?: string;
}

export interface ParseResult {
  model: StoryMap;
  diagnostics: Diagnostic[];
}
