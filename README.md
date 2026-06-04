# Joynal（ジョイナル）

> 今日の「楽しい」を、明日の成長へ

新人研修の日報管理Webアプリです。

## 概要

新人が毎日の振り返りを入力・閲覧し、メンター・OJTが週次コメントを行い、管理者がユーザーや権限を管理するWebアプリです。

## 技術スタック

| 項目            | 技術                               |
| --------------- | ---------------------------------- |
| フロントエンド  | Nuxt 4                             |
| UI ライブラリ   | Nuxt UI v4（Tailwind CSS v4 含む） |
| データアクセス  | Nuxt Server API（`server/api/`）   |
| バックエンド/DB | Supabase（認証・DB・RLS）          |
| ホスティング    | Cloudflare Pages                   |

### 主なパッケージ

| パッケージ             | 用途                                             |
| ---------------------- | ------------------------------------------------ |
| `@nuxt/ui`             | UIコンポーネント（Modal, Toast, Table, Form, Icon 等） |
| `@nuxtjs/supabase`     | Supabase 連携（認証・データ取得）                |
| `zod`                  | フォーム・サーバー境界のバリデーション（`UForm` の `:schema` に渡す） |
| `@vueuse/core`         | ユーティリティ composables                       |

## ユーザー種別

| 種別     | できること                                 |
| -------- | ------------------------------------------ |
| 新人     | 自分の日報を入力・編集・閲覧、コメント閲覧 |
| メンター | 担当新人の日報閲覧、週次コメント入力       |
| OJT      | 担当新人の日報閲覧、週次コメント入力       |
| 管理者   | 全日報閲覧、ユーザー管理、権限設定         |

## セットアップ

```bash
pnpm install
```

### 環境変数

`.env.example` をコピーして `.env` を作成し、Supabaseの認証情報を設定してください。

```bash
cp .env.example .env
```

### 開発サーバー起動

```bash
pnpm dev
```

`http://localhost:3000` で起動します。

## 開発コマンド

```bash
pnpm dev            # 開発サーバー起動
pnpm build          # 本番ビルド
pnpm lint           # ESLint 実行
pnpm lint:fix       # ESLint 自動修正・整形（フォーマッタ兼用）
pnpm typecheck      # 型チェック（vue-tsc --noEmit）
pnpm test           # ユニット・統合テスト実行
pnpm test:watch     # テストをウォッチ実行
pnpm test:coverage  # カバレッジ付きでテスト実行
pnpm test:e2e       # E2E テスト（Playwright・要ローカル Supabase）
```

> フォーマッタは @nuxt/eslint の stylistic ルールが担当するため、Prettier は使いません。

## プロジェクト構成

```
app/
├── assets/css/       # グローバルCSS
├── components/       # ドメイン別フォルダで整理（pathPrefix:false で名前は据え置き）
│   ├── admin/        # 管理UI（UserTable / UserFormModal / AssignmentRow）
│   ├── common/       # ヘッダー・フッター・認証・共通部品（AppHeader / ConfirmDialog 等）
│   └── report/       # 日報UI（ReportRow / ReportRowDetail / CommentArea 等）
├── composables/      # 共通 composables（useCurrentUser / useWeeklyReports / useAdminUsers / useModalForm / usePageLoading 等）
├── layouts/          # レイアウト（default.vue）
├── middleware/       # 認証ミドルウェア（auth.global.ts）
├── pages/            # ページ（login / report / admin / confirm / reset-password）
└── utils/            # app 専用ユーティリティ（time / calendarDate / role / fetchError / passwordReset / asyncDataCache）
shared/               # app・server 両方から参照される共有層
├── types/            # 全ての型をここに集約（#shared/types/* でインポート）
│   ├── models.ts          # DB テーブル型エイリアス
│   ├── api.ts             # API リクエスト・レスポンスの型・共有定数
│   ├── schemas.ts         # Zod スキーマ（フォーム＋サーバー境界の query/body）
│   ├── database.types.ts  # Supabase 自動生成（npx supabase gen types で再生成、編集禁止）
│   └── components.ts       # コンポーネントの defineExpose 型
└── utils/            # app・server 共通の純粋ロジック（date.ts など）
server/               # Nuxt Server API（ブラウザから直接 Supabase を呼ばない）
├── api/
│   ├── auth/         # 認証（login / logout / reset-password / reset-password-otp / update-password）
│   ├── reports/      # 日報 CRUD
│   ├── comments/     # 週次コメント取得・保存
│   ├── assignments/  # 担当新人一覧・割り当て
│   └── users/        # ユーザー管理（me・一覧・招待・更新）
└── utils/            # server 専用ユーティリティ（auth / supabaseError / validate / year）
docs/                 # 設計ドキュメント・開発計画
e2e/                  # Playwright E2E（主要フローの統合テスト・ローカル Supabase）
supabase/migrations/  # DBマイグレーション
supabase/seed.sql     # ローカル/E2E 用シード（テストユーザー）
```

開発の進め方は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## ドキュメント

| ドキュメント | 内容 |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | アーキテクチャ設計・データフロー |
| [docs/api-design.md](docs/api-design.md) | Server API エンドポイント仕様 |
| [docs/coding-guidelines.md](docs/coding-guidelines.md) | コーディング規約 |
| [docs/component-diagram.md](docs/component-diagram.md) | コンポーネント構成図 |
| [docs/requirements.md](docs/requirements.md) | 要件定義 |
| [docs/screen-flow.md](docs/screen-flow.md) | 画面一覧・画面遷移図 |
| [docs/design-spec.md](docs/design-spec.md) | デザイン仕様書 |
| [docs/db-design.md](docs/db-design.md) | DBテーブル設計書 |
| [docs/rls-design.md](docs/rls-design.md) | RLS設計書 |
