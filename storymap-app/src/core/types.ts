export interface StoryMap {
  title: string | null;
  releases: Release[];   // top-level release name declarations
  activities: Activity[];
}

/** A named release line. tier = 1-based separator index (1st --- in each task = tier 1). */
export interface Release {
  id: string;
  name: string | null;
  tier: number;
}

export interface Activity {
  id: string;
  name: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  name: string;
  items: Item[];  // flat list of StoryItems and ReleaseItems (tier separators)
}

export type Item = StoryItem | TierSeparator;

export interface StoryItem {
  id: string;
  type: 'story';
  text: string;
}

/** A tier boundary within a task — written as `---` in the text format. */
export interface TierSeparator {
  id: string;
  type: 'separator';
}

export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  line: number;
  message: string;
  suggestion?: string;
}

export interface ParseResult {
  model: StoryMap;
  diagnostics: Diagnostic[];
}
