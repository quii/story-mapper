import { useCallback, useEffect, useRef, useState } from 'react';
import type { Diagnostic, StoryMap } from '../core/types';
import { parse } from '../core/parse';
import { serialize } from '../core/serialize';
import { readUrlHash, updateUrlHash } from '../core/url';
import { STARTER_TEXT } from '../core/examples';

interface UseStoryMapReturn {
  text: string;
  model: StoryMap;
  diagnostics: Diagnostic[];
  setText: (text: string) => void;
  updateModel: (model: StoryMap) => void;
}

export function useStoryMap(): UseStoryMapReturn {
  const initialText = readUrlHash() ?? STARTER_TEXT;
  const initialParsed = parse(initialText);

  const [text, setTextState] = useState(initialText);
  const [model, setModel] = useState<StoryMap>(initialParsed.model);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>(initialParsed.diagnostics);

  const hashDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // text → model (user typed in editor)
  const setText = useCallback((newText: string) => {
    const { model: newModel, diagnostics: newDiags } = parse(newText);
    setTextState(newText);
    setModel(newModel);
    setDiagnostics(newDiags);

    if (hashDebounceRef.current) clearTimeout(hashDebounceRef.current);
    hashDebounceRef.current = setTimeout(() => updateUrlHash(newText), 800);
  }, []);

  // model → text (user edited canvas)
  const updateModel = useCallback((newModel: StoryMap) => {
    const newText = serialize(newModel);
    setModel(newModel);
    setTextState(newText);
    setDiagnostics([]);

    if (hashDebounceRef.current) clearTimeout(hashDebounceRef.current);
    hashDebounceRef.current = setTimeout(() => updateUrlHash(newText), 800);
  }, []);

  // Sync URL on mount if no hash was present
  useEffect(() => {
    if (!window.location.hash) {
      updateUrlHash(initialText);
    }
    return () => {
      if (hashDebounceRef.current) clearTimeout(hashDebounceRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { text, model, diagnostics, setText, updateModel };
}
