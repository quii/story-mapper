import { useState } from 'react';
import { useStoryMap } from './hooks/useStoryMap';
import { useResize } from './hooks/useResize';
import { Editor } from './components/editor/Editor';
import { Canvas } from './components/canvas/Canvas';
import { Toolbar } from './components/toolbar/Toolbar';
import { AiModal } from './components/ai/AiModal';
import { EXAMPLE_TEXT, STARTER_TEXT } from './core/examples';
import styles from './App.module.css';

export function App() {
  const { text, model, diagnostics, setText, updateModel } = useStoryMap();
  const { width, onMouseDown } = useResize(340);
  const [aiOpen, setAiOpen] = useState(false);

  const handleLoadExample = () => setText(EXAMPLE_TEXT);
  const handleStartFromScratch = () => setText(STARTER_TEXT);

  return (
    <div className={styles.app}>
      <Toolbar
        text={text}
        model={model}
        onLoadExample={handleLoadExample}
        onOpenAi={() => setAiOpen(true)}
      />
      <div className={styles.body}>
        <div className={styles.editorPane} style={{ width }}>
          <Editor text={text} diagnostics={diagnostics} onChange={setText} />
        </div>
        <div
          className={styles.resizeHandle}
          onMouseDown={onMouseDown}
          role="separator"
          aria-label="Resize editor"
          aria-orientation="vertical"
        />
        <div className={styles.canvasPane}>
          <Canvas
            model={model}
            onChange={updateModel}
            onLoadExample={handleLoadExample}
            onStartFromScratch={handleStartFromScratch}
          />
        </div>
      </div>
      {aiOpen && <AiModal onClose={() => setAiOpen(false)} />}
    </div>
  );
}
