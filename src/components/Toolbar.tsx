import type { ImageEditor } from '../hooks/useImageEditor';

export function Toolbar({ editor }: { editor: ImageEditor }) {
  const hasImage = Boolean(editor.staffImage);
  const isCrop = editor.mode === 'crop';
  const isFill = editor.mode === 'fill';

  return (
    <aside className="toolbar">
      <h1>スタッフ写真</h1>

      <section className="panel-section">
        <label className="label" htmlFor="staff-photo-input">スタッフ写真</label>
        <div className="file-row">
          <input
            id="staff-photo-input"
            className="file-input"
            type="file"
            accept="image/*"
            onChange={editor.handleFileChange}
          />
          <button className="btn danger remove-btn" type="button" disabled={!hasImage} onClick={editor.removeStaffImage}>
            削除
          </button>
        </div>
        <p className="drop-hint">左の編集エリアへ画像をドラッグ＆ドロップできます。</p>
      </section>

      <section className="panel-section">
        <div className="button-grid">
          {!isCrop ? (
            <button className="btn" type="button" disabled={!hasImage} onClick={editor.startCrop}>
              トリミング
            </button>
          ) : (
            <div className="button-row">
              <button className="btn success" type="button" onClick={editor.confirmCrop}>
                確定
              </button>
              <button className="btn danger" type="button" onClick={editor.cancelCrop}>
                キャンセル
              </button>
            </div>
          )}
          <button className={`btn ${isFill ? 'active' : ''}`} type="button" disabled={!hasImage || isCrop} onClick={editor.startFillMode}>
            背景補完モード
          </button>
          <button className="btn primary" type="button" onClick={editor.saveJpeg}>
            JPGで保存
          </button>
        </div>
        <p className="status">{editor.status}</p>
        {isFill && <p className="status">背景色にしたい写真内の部分を矩形で選択してください。</p>}
        {isCrop && <p className="status">写真内をドラッグすると表示範囲が移動します。ハンドルでサイズ調整できます。</p>}
        {editor.fillPatch && (
          <div className="swatch-line">
            <span className="swatch patch-preview" style={{ backgroundImage: `url(${editor.fillPatch.src})` }} />
            <span>選択範囲を背景補完に使用中</span>
          </div>
        )}
      </section>

      <section className="panel-section">
        <div className="meta-list">
          <span><strong>印刷範囲:</strong> 赤い点線枠の内側</span>
          <span><strong>出力:</strong> 1500 × 1124 px</span>
          <span><strong>形式:</strong> JPG / 品質 95%</span>
          <span><strong>テンプレート:</strong> 固定・最前面</span>
          <span><strong>縦横比:</strong> 通常固定 / Shift中のみ自由変形</span>
        </div>
      </section>
    </aside>
  );
}
