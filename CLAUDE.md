# CLAUDE.md

このファイルはリポジトリで作業する Claude Code (claude.ai/code) へのガイダンスです。

## コマンド

```bash
pnpm dev           # 開発サーバー起動（http://localhost:3000）
pnpm build         # 本番ビルド（Nitro / Cloudflare Pages プリセット）
pnpm lint          # ESLint チェック
pnpm lint:fix      # ESLint 自動修正（フォーマッタ兼用 — @nuxt/eslint stylistic）
pnpm test          # Vitest 実行（ユニット・統合テスト）
pnpm test:watch    # Vitest ウォッチモード
pnpm typecheck     # 型チェック（vue-tsc --noEmit）
```

環境変数: `.env.example` を `.env` にコピーして Supabase の認証情報を設定する。

## アーキテクチャ

Nuxt 4 アプリ（`app/` ディレクトリ構成）を **Cloudflare Pages** に Nitro 経由でデプロイ。

```
ブラウザ（Vue/Nuxt）
  └─ $fetch('/api/...') ──► Nuxt Server API（server/api/、Nitro）
                                └─ serverSupabaseClient(event) ──► Supabase（PostgreSQL + RLS）
```

**重要ルール**: フロントエンドは Supabase を直接呼ばない。すべてのデータアクセスは `server/api/` 経由。`serverSupabaseClient(event)` がユーザーの JWT を転送するため、Supabase RLS ポリシーが自動適用される（サーバー側で認可ロジックを二重実装しない）。

認証は `@nuxtjs/supabase` が担当し、未ログインユーザーを `/login` に自動リダイレクト。`auth.global.ts` ミドルウェアはロールベースのガード（非管理者を `/admin` からリダイレクト等）のみ追加する。

## 主要ディレクトリ

| パス | 役割 |
|------|------|
| `app/pages/` | `login`、`report`（全ロール）、`admin`（管理者のみ）、`confirm`、`reset-password` |
| `app/components/` | `ReportInputModal`、`ReportCard`、`CommentInputModal`、`UserAddModal`、`UserEditModal` |
| `app/composables/useCurrentUser.ts` | ログインユーザーのプロフィールとロールを返す |
| `app/middleware/auth.global.ts` | ロールベースリダイレクト（`/admin` のみガード） |
| `server/api/reports/` | GET 週間一覧、POST 作成、PUT/DELETE（ID指定） |
| `server/api/comments/` | GET/PUT 週次コメント（upsert） |
| `server/api/assignments/` | GET 担当新人一覧、PUT メンター割り当て（管理者のみ） |
| `server/api/users/` | GET 一覧、POST 招待、PUT 更新（管理者のみ） |
| `shared/types/models.ts` | DB テーブル型エイリアス（こちらをインポートする） |
| `shared/types/api.ts` | app・server 共通の API リクエスト・レスポンス型 |
| `shared/types/schemas.ts` | フォームバリデーション用 Zod スキーマ（型は `z.output<>` で導出） |
| `shared/types/database.types.ts` | Supabase 自動生成ファイル — **編集禁止** |
| `shared/types/components.ts` | コンポーネントの defineExpose 型 |
| `shared/utils/` | app・server 共通の純粋ロジック（直下は両側で auto-import、明示は `#shared/utils/*`）。例: `date.ts`（日付/週/曜日） |
| `supabase/migrations/` | PostgreSQL マイグレーション SQL |

## ユーザーロール

`trainee`（新人）・`mentor`・`ojt`・`admin` — Supabase RLS ポリシーで強制（フロントガードだけに依存しない）。

## コーディング規約

- **Vue**: `<script setup lang="ts">` のみ、Options API 不使用
- **TypeScript**: アロー関数を基本とする、関数シグネチャに型を明示、`any` 不使用（`unknown` を使う）
- **型の置き場所**: 全ての型を `shared/types/` に集約し `#shared/types/*` でインポートする（`models` / `api` / `schemas` / `database.types` / `components`）。コンポーネント内にインラインで型定義しない
- **ロジックの置き場所**: app↔server 双方で使う純粋ロジックは `shared/utils/`（直下は両側で auto-import、明示は `#shared/utils/*`。例: `date.ts`）。app 専用は `app/utils/`、server 専用は `server/utils/`
- **型アサーション**: `as` と非null `!` はなるべく使わない。明示的な null チェック・型ガード・`?? デフォルト` で絞り込む（型述語の type guard 内など真に必要な箇所のみ許容）
- **データ取得**（用途別に Nuxt プリミティブを使い分ける）:
  - ロード（GET・レンダー時）: `useFetch` / `useAsyncData`（SSR・重複排除・キャッシュ）。`onMounted + $fetch` は使わない。複数箇所で共有するロードは `useAsyncData` に**キーを付ける**（例: `useCurrentUser` はキー `'current-user'`）
  - 共有状態: `useState` または keyed `useAsyncData`
  - ミューテーション（POST/PUT/DELETE・イベント駆動）: `$fetch` を必ず `try/catch` + `useApiError`（トースト）でラップ
  - SSR で手動取得時に Cookie 転送が必要なら `useRequestFetch`
- **命名**: コンポーネントは PascalCase、composable は camelCase（`use` プレフィックス）、ページと API ハンドラーは kebab-case、定数は UPPER_SNAKE_CASE
- **`type` vs `interface`**: 基本は `type`、`extends` が必要な場合のみ `interface`
- **`console.log` はコミットしない**

## テスト

Vitest + `@nuxt/test-utils`（happy-dom 環境）。テストはソースファイルと同じ場所に `*.test.ts` / `*.spec.ts` として配置。カバレッジは v8。

Server API ハンドラーは Supabase クライアントをモックしてテスト。Vue コンポーネントは `$fetch` をモックしてテスト。

## 設計ドキュメント

`docs/` 配下にアーキテクチャ、API 仕様、DB 設計、RLS 設計、画面フローなどのドキュメントあり。