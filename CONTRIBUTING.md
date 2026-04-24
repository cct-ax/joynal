# 開発ガイド

## 開発を始める前に

### 必要なツール

- [Node.js](https://nodejs.org/) v22 以上
- [pnpm](https://pnpm.io/) v10 以上（`npm install -g pnpm`）
- [Git](https://git-scm.com/)
- [VS Code](https://code.visualstudio.com/)（推奨エディタ）

### 初回セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/<org>/joynal.git
cd joynal

# パッケージをインストール
pnpm install

# 環境変数を設定
cp .env.example .env
# .env を開いて Supabase の URL と anon key を入力する（PLに確認）

# 開発サーバーを起動
pnpm dev
```

`http://localhost:3000` にアクセスしてログイン画面が表示されれば OK です。

---

## 作業フロー

### 1. Issue を確認する

GitHub Projects の Board ビューで「Todo」になっている自分のタスクを確認します。

### 2. ブランチを作成する

`main` ブランチから作業ブランチを切ります。

```bash
git switch main
git pull origin main
git switch -c feature/2-1-report-layout
```

**ブランチ名のルール**: `feature/<Issue番号>-<内容の概要>`

| プレフィックス | 用途 |
|--------------|------|
| `feature/` | 新機能の追加 |
| `fix/` | バグ修正 |
| `chore/` | 設定変更・環境整備など |

### 3. コードを書く

開発サーバーを起動した状態で実装します。

```bash
pnpm dev
```

保存するたびにブラウザが自動でリロードされます。

### 4. コミットする

変更ができたらコミットします。コミットメッセージは日本語でも OK ですが、以下の形式にそろえてください。

```
<type>: <内容>
```

| type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `refactor` | リファクタリング |
| `chore` | 設定・依存関係の変更 |
| `docs` | ドキュメントのみの変更 |

**例**:
```bash
git add app/pages/report.vue
git commit -m "feat: 週ナビゲーションUIを実装"
```

### 5. プッシュして PR を作成する

```bash
git push origin feature/2-1-report-layout
```

GitHub でプルリクエストを作成します。PR テンプレートに沿って記入し、PL をレビュアーに指定してください。

---

## コーディングルール

詳細は [docs/coding-guidelines.md](docs/coding-guidelines.md) を参照してください。主なルールは以下のとおりです。

### Vue コンポーネント

- `<script setup lang="ts">` を使う（Options API は使わない）
- 関数はアロー関数で書く（`const handleClick = () => { ... }`）
- 変数名・関数名は略称にしない（`btn` より `button`、`idx` より `index`）

### データ取得・保存（Server API 経由）

フロントエンドから直接 Supabase を呼ばず、必ず `$fetch` で Server API を経由します。

```typescript
// ✓ データ取得
const reports = await $fetch('/api/reports', {
  query: { weekStart: '2026-05-19' }
})

// ✓ データ保存
await $fetch('/api/reports', {
  method: 'POST',
  body: { date: '2026-05-19', check_in: '09:00', check_out: '18:00', content: '...' }
})
```

エラーハンドリングも必ず書いてください。

```typescript
try {
  const reports = await $fetch('/api/reports', { query: { weekStart } })
} catch {
  toast.add({ title: '日報の取得に失敗しました', color: 'error' })
}
```

API の仕様は [docs/api-design.md](docs/api-design.md) を参照してください。

### 型定義

型・インターフェース・Zod スキーマは `app/types/` に集約します。コンポーネント内でインラインに定義しないでください。

```typescript
// ✓ よい例
import type { DailyReport } from '~/types/models'
import { reportSchema, type ReportSchema } from '~/types/schemas'

// ✗ 悪い例（コンポーネント内に直接定義）
type DailyReport = { id: string; content: string }
```

### フォームバリデーション

Nuxt UI の `UForm` と `zod` を使います。詳しくは `app/components/FormExample.vue` を参照してください。

### トースト通知

```typescript
const toast = useToast()

// 成功時
toast.add({ title: '保存しました', color: 'success' })

// エラー時
toast.add({ title: 'エラーが発生しました', color: 'error' })
```

---

## よく使うコマンド

```bash
pnpm dev          # 開発サーバー起動
pnpm lint         # コードのチェック（エラーがないか確認）
pnpm lint:fix     # コードの自動修正
pnpm format       # フォーマット整形
```

PR を出す前に `pnpm lint` を実行してエラーがないことを確認してください。

---

## 困ったときは

- PL に直接相談してください
- コードのエラーは VS Code のターミナルに表示されているメッセージを共有してもらえると助かります
