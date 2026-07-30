import { useCallback, useEffect, useRef, useState } from 'react';
import type { Diagnostic, StoryMap } from '../core/types';
import { parse } from '../core/parse';
import { serialize } from '../core/serialize';
import { readUrlHash, updateUrlHash } from '../core/url';
import { readLocalBackup, saveLocalBackup } from '../core/localBackup';
import { readSrcParam, fetchSource } from '../core/source';
import { STARTER_TEXT } from '../core/examples';

export type SourceStatus = 'idle' | 'loading' | 'synced' | 'error';

interface UseStoryMapReturn {
  text: string;
  model: StoryMap;
  diagnostics: Diagnostic[];
  setText: (text: string) => void;
  updateModel: (model: StoryMap) => void;
  sourceUrl: string | null;
  sourceStatus: SourceStatus;
  sourceError: string | null;
  syncFromSource: () => void;
}

// A `?src=` link owns the document: it never reads or writes the URL hash
// (that's how the hash-encoded sharing mode stays a separate concern), and
// on load it prefers a local backup already tied to that same src over
// re-fetching, so a stray refresh can't clobber edits made since the last sync.
function resolveInitialState(sourceUrl: string | null): { text: string; needsFetch: boolean } {
  if (sourceUrl) {
    const backup = readLocalBackup();
    if (backup && backup.srcUrl === sourceUrl) {
      return { text: backup.text, needsFetch: false };
    }
    return { text: STARTER_TEXT, needsFetch: true };
  }
  const hashText = readUrlHash();
  if (hashText !== null) {
    return { text: hashText, needsFetch: false };
  }
  const backup = readLocalBackup();
  return { text: backup?.text ?? STARTER_TEXT, needsFetch: false };
}

export function useStoryMap(): UseStoryMapReturn {
  const sourceUrl = readSrcParam();
  const { text: initialText, needsFetch } = resolveInitialState(sourceUrl);
  const initialParsed = parse(initialText);

  const [text, setTextState] = useState(initialText);
  const [model, setModel] = useState<StoryMap>(initialParsed.model);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>(initialParsed.diagnostics);
  const [sourceStatus, setSourceStatus] = useState<SourceStatus>(
    needsFetch ? 'loading' : sourceUrl ? 'synced' : 'idle'
  );
  const [sourceError, setSourceError] = useState<string | null>(null);

  const persistDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (value: string) => {
      saveLocalBackup(value, sourceUrl);
      if (!sourceUrl) {
        updateUrlHash(value);
      }
    },
    [sourceUrl]
  );

  // text → model (user typed in editor)
  const setText = useCallback(
    (newText: string) => {
      const { model: newModel, diagnostics: newDiags } = parse(newText);
      setTextState(newText);
      setModel(newModel);
      setDiagnostics(newDiags);

      if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current);
      persistDebounceRef.current = setTimeout(() => persist(newText), 800);
    },
    [persist]
  );

  // model → text (user edited canvas)
  const updateModel = useCallback(
    (newModel: StoryMap) => {
      const newText = serialize(newModel);
      setModel(newModel);
      setTextState(newText);
      setDiagnostics([]);

      if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current);
      persistDebounceRef.current = setTimeout(() => persist(newText), 800);
    },
    [persist]
  );

  const syncFromSource = useCallback(() => {
    if (!sourceUrl) return;
    setSourceStatus('loading');
    setSourceError(null);
    fetchSource(sourceUrl)
      .then((fetched) => {
        const { model: newModel, diagnostics: newDiags } = parse(fetched);
        setTextState(fetched);
        setModel(newModel);
        setDiagnostics(newDiags);
        persist(fetched);
        setSourceStatus('synced');
      })
      .catch((err: unknown) => {
        setSourceStatus('error');
        setSourceError(err instanceof Error ? err.message : 'Failed to load');
      });
  }, [sourceUrl, persist]);

  // On mount: fetch from source if we don't already have a matching local
  // backup, otherwise fall back to the pre-existing hash/backup sync.
  useEffect(() => {
    if (needsFetch) {
      syncFromSource();
    } else if (!sourceUrl && !window.location.hash) {
      persist(initialText);
    }
    return () => {
      if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    text,
    model,
    diagnostics,
    setText,
    updateModel,
    sourceUrl,
    sourceStatus,
    sourceError,
    syncFromSource,
  };
}
