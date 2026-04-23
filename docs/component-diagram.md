# コンポーネント構成図

> 実線: 現在実装済み / 点線: 今後実装予定

```mermaid
graph TD
  subgraph Entry["エントリーポイント"]
    AppVue["app.vue"]
  end

  subgraph Middleware["ミドルウェア"]
    AuthMiddleware["auth.global.ts\n/admin へのアクセス時に\nadmin ロールを確認"]
  end

  subgraph Layout["レイアウト"]
    DefaultLayout["layouts/default.vue\nヘッダー・ナビゲーション\nログアウトボタン"]
  end

  subgraph Pages["ページ"]
    IndexPage["/index.vue\n→ /report へリダイレクト"]
    LoginPage["login.vue\n/login\nメール・パスワード認証"]
    ResetPage["reset-password.vue\n/reset-password\nパスワードリセットメール送信"]
    ConfirmPage["confirm.vue\n/confirm\n認証コールバック"]
    ReportPage["report.vue\n/report\n週次日報一覧\nロール別表示切り替え"]
    AdminPage["admin.vue\n/admin\nユーザー管理\nメンター割り当て"]
    ErrorPage["error.vue\n404 / 500"]
  end

  subgraph Components["コンポーネント（今後追加）"]
    ReportInputModal["ReportInputModal.vue\n日報入力・編集モーダル\n新人のみ操作可"]
    ReportCard["ReportCard.vue\n日報カード（インライン展開）\nクリックで詳細表示"]
    CommentInputModal["CommentInputModal.vue\n週次コメント入力モーダル\nメンター・OJT用"]
    UserAddModal["UserAddModal.vue\nユーザー追加モーダル\n管理者用"]
    FormExample["FormExample.vue\nフォームサンプル\n（実装参考用）"]
  end

  subgraph Composables["Composables"]
    UseCurrentUser["useCurrentUser.ts\nprofile / role\nisAdmin / isMentor\nisOjt / isTrainee"]
  end

  subgraph Types["型定義"]
    DBTypes["types/database.types.ts\nTables, Insert, Update"]
  end

  subgraph Supabase["Supabase（外部サービス）"]
    SupabaseAuth["Supabase Auth\n認証・セッション管理"]
    SupabaseDB["Supabase DB + RLS\nprofiles\ndaily_reports\ncomments\nmentor_assignments"]
  end

  AppVue --> DefaultLayout
  DefaultLayout --> Pages
  AuthMiddleware -. "/admin アクセス時" .-> AdminPage

  DefaultLayout --> UseCurrentUser
  ReportPage --> UseCurrentUser
  AdminPage --> UseCurrentUser
  UseCurrentUser --> SupabaseAuth
  UseCurrentUser --> SupabaseDB

  LoginPage --> SupabaseAuth
  ResetPage --> SupabaseAuth
  ConfirmPage --> SupabaseAuth

  ReportPage --> SupabaseDB
  AdminPage --> SupabaseDB

  ReportPage -. "MS2" .-> ReportInputModal
  ReportPage -. "MS3" .-> ReportCard
  ReportPage -. "MS3" .-> CommentInputModal
  AdminPage -. "MS4" .-> UserAddModal

  UseCurrentUser --> DBTypes
  ReportPage --> DBTypes
  AdminPage --> DBTypes
```

---

## 各ファイルの役割

### エントリーポイント

| ファイル | 役割 |
|---------|------|
| `app.vue` | Nuxt アプリのルート。`NuxtLayout` と `NuxtPage` を配置するだけ |

### ミドルウェア

| ファイル | 役割 |
|---------|------|
| `middleware/auth.global.ts` | 全ルートで実行。`/admin` へのアクセス時のみ `profiles.role` を確認し、admin 以外は `/report` へリダイレクト。未ログインのリダイレクトは `@nuxtjs/supabase` が自動処理 |

### レイアウト

| ファイル | 役割 |
|---------|------|
| `layouts/default.vue` | 全ページ共通のヘッダー・ナビ。`useCurrentUser` でロールを取得し、管理者のみ管理画面リンクを表示 |

### ページ

| ファイル | パス | 役割 |
|---------|------|------|
| `pages/index.vue` | `/` | `/report` へリダイレクトするだけ |
| `pages/login.vue` | `/login` | メール・パスワードでログイン |
| `pages/reset-password.vue` | `/reset-password` | パスワードリセットメール送信 |
| `pages/confirm.vue` | `/confirm` | メールリンクからの認証コールバック（`@nuxtjs/supabase` が自動処理） |
| `pages/report.vue` | `/report` | 週次日報一覧。ロールに応じて表示・操作内容が切り替わる共通画面 |
| `pages/admin.vue` | `/admin` | ユーザー管理・メンター割り当てのタブ切り替え画面 |
| `error.vue` | （自動） | 404 / 500 エラー画面 |

### Composables

| ファイル | 役割 |
|---------|------|
| `composables/useCurrentUser.ts` | ログインユーザーの `profiles` レコードを取得。`role` / `isAdmin` / `isMentor` / `isOjt` / `isTrainee` をリアクティブに返す。複数ページで共通利用 |

### 今後追加するコンポーネント

| ファイル | MS | 役割 |
|---------|-----|------|
| `components/ReportInputModal.vue` | MS2 | 日報の入力・編集モーダル（新人のみ） |
| `components/ReportCard.vue` | MS3 | 日報カード。クリックでインライン展開し、詳細内容を表示 |
| `components/CommentInputModal.vue` | MS3 | 週次コメント入力モーダル（メンター・OJTのみ） |
| `components/UserAddModal.vue` | MS4 | ユーザー招待フォームモーダル（管理者のみ） |
