# Joynal（ジョイナル）

> 今日の「楽しい」を、明日の成長へ

新人研修の日報管理Webアプリです。

## 概要

新人が毎日の振り返りを入力・閲覧し、メンター・OJTが週次コメントを行い、管理者がユーザーや権限を管理するWebアプリです。

## 技術スタック

| 項目            | 技術                               |
| --------------- | ---------------------------------- |
| フロントエンド  | Nuxt 4                             |
| UI ライブラリ   | Nuxt UI v3（Tailwind CSS v4 含む） |
| データアクセス  | Nuxt Server API（`server/api/`）   |
| バックエンド/DB | Supabase（認証・DB・RLS）          |
| ホスティング    | Cloudflare Pages                   |

### 主なパッケージ

| パッケージ             | 用途                                             |
| ---------------------- | ------------------------------------------------ |
| `@nuxt/ui`             | UIコンポーネント（Modal, Toast, Table, Form 等） |
| `@nuxtjs/supabase`     | Supabase 連携（認証・データ取得）                |
| `zod` + `vee-validate` | フォームバリデーション                           |
| `@vueuse/core`         | ユーティリティ composables                       |
| `@iconify/vue`         | アイコン                                         |

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
pnpm dev          # 開発サーバー起動
pnpm build        # 本番ビルド
pnpm lint         # ESLint 実行
pnpm lint:fix     # ESLint 自動修正
pnpm format       # Prettier フォーマット
pnpm exec vue-tsc --noEmit  # 型チェック
```

## プロジェクト構成

```
app/
├── assets/css/       # グローバルCSS
├── components/       # 共通コンポーネント
├── composables/      # 共通 composables（useCurrentUser 等）
├── layouts/          # レイアウト（default.vue）
├── middleware/        # 認証ミドルウェア
├── pages/            # ページ（login / report / admin / confirm / reset-password）
└── types/
    ├── database.types.ts  # Supabase 自動生成（編集禁止）
    ├── models.ts          # DB テーブル型エイリアス
    ├── api.ts             # API リクエスト・レスポンス型
    └── schemas.ts         # Zod スキーマ（フォームバリデーション用）
server/api/           # Server API（ブラウザから直接 Supabase を呼ばない）
├── reports/          # 日報 CRUD
├── comments/         # 週次コメント取得・保存
└── assignments/      # 担当新人一覧
docs/                 # 設計ドキュメント・開発計画
supabase/migrations/  # DBマイグレーション
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
