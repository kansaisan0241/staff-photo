# スタッフ写真

営業スタッフの写真を会社テンプレートと合成し、プロフィール画像を書き出す React + TypeScript + Vite アプリです。Cloudflare Pages へそのままデプロイできます。

## インストール方法

```bash
npm install
```

## 起動方法

```bash
npm run dev
```

## ビルド方法

```bash
npm run build
```

`dist` フォルダが生成されます。

## Cloudflare Pages デプロイ方法

### Direct Upload で公開する場合

1. `npm run build` を実行します。
2. Cloudflare ダッシュボードで `Workers & Pages` を開きます。
3. `Pages` から `Direct Upload` を選択します。
4. `dist` フォルダ、または `staff-photo-pages.zip` をアップロードします。
5. 発行された `*.pages.dev` のURLで公開されます。

### Git 連携で公開する場合

Cloudflare Pages でこのリポジトリを接続し、以下を設定します。

- Build command: `npm run build`
- Build output directory: `dist`
- Framework preset: `Vite`

## 使い方

1. 「スタッフ写真」から画像を選択、または編集エリアへドラッグ＆ドロップします。
2. 写真はテンプレートの背面、右側中央へ自動配置されます。
3. 写真をドラッグして移動します。
4. 赤い点線枠の内側が印刷・保存される範囲です。
5. 四隅・上下左右中央の丸形ハンドルでリサイズします。
6. 通常は縦横比固定、Shift キー押下中のみ自由変形できます。
7. 「トリミング」で写真内の表示範囲を調整し、「確定」または「キャンセル」を選びます。
8. 「JPGで保存」で書き出します。

## 背景補完機能

「背景補完モード」を押したあと、写真内の背景部分をドラッグして矩形選択します。選択した範囲の画像片を1枚の背景としてキャンバス全体へ引き伸ばし、最背面に配置します。

単一の平均色で塗る方式ではないため、背景のわずかなムラを残したまま補完できます。レイヤー構造は、背景補完画像、スタッフ写真、`template.png` の順で、テンプレートは常に最前面です。

## JPG 出力

保存時は 1500 × 1124 px のキャンバスへ以下の順番で描画します。

1. 背景補完画像
2. スタッフ写真
3. `public/template.png`

出力形式は `image/jpeg`、品質は `0.95` です。ファイル名は `staff-photo-yyyyMMdd-HHmmss.jpg` 形式です。
