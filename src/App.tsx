import { CanvasEditor } from './components/CanvasEditor';
import { Toolbar } from './components/Toolbar';
import { useImageEditor } from './hooks/useImageEditor';

export default function App() {
  const editor = useImageEditor();

  return (
    <main className="app-shell">
      <section className="workspace" onDrop={editor.handleDrop} onDragOver={editor.handleDragOver}>
        <CanvasEditor editor={editor} />
      </section>
      <Toolbar editor={editor} />
    </main>
  );
}
