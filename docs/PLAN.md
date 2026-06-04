# 日報ツール開発計画

## 背景・目的

### 現状の課題

- 現在はSpreadsheetで日報を管理しているが、管理しにくい
- 以前からツール化の要望があった

### プロジェクトの目的

1. **日報管理のツール化**: Spreadsheetを置き換える日報Webアプリを開発する
2. **メンバー育成**: 他部署メンバー（開発経験ほぼ0）に開発を経験させる（上期のメイン目的）
3. **下期に本格提案**: 上期は裏で開発を進め、下期に会社へ正式に提案する

### 日報の利用シーン

- 新人（約15人/年、毎年変わる）が日報を書く
- 新人1人に対して、メンター1人 + OJT 1人が付く
- メンター・OJTが週ごとにコメントを入力する
- 管理者がユーザーや閲覧権限を管理する

---

## 技術スタック

| 項目 | 技術 | 備考 |
|------|------|------|
| フロントエンド | Nuxt 4 | PLにVue/Nuxtの経験あり |
| データアクセス | Nuxt Server API (`server/api/`) | スキーマ露出防止・テスト容易化のため採用 |
| バックエンド/DB | Supabase | 認証、DB、RLS |
| ホスティング | Cloudflare Pages | |

### データアクセス方針

フロントエンド（Vue）から直接 Supabase クライアントを呼ばず、**Nuxt Server API を経由してDBにアクセスする**。

```
ブラウザ（Vue） → $fetch('/api/...') → server/api/（Nuxt） → Supabase（RLS付き） → PostgreSQL
```

- `serverSupabaseClient(event)` を使用し、ユーザーの JWT で Supabase にアクセスする（RLS は引き続き有効）
- フロントエンドにテーブル名・カラム名が露出しない
- サーバー側はモックしやすい関数なのでユニットテストが書きやすい

### 技術選定の経緯

- PLがNuxtの経験があるため、メンバーに教えやすい
- Next.js（React系）も候補に上がったが、PLにReact経験がないため見送り
- Nuxt 4は安定版ではないリスクがあるが、PLの判断で採用

---

## チーム構成

| 役割 | 担当 | 備考 |
|------|------|------|
| PL | 自分 | 全体設計、進捗管理、レビュー、一部開発 |
| 開発 | メンバー（他部署） | 開発経験ほぼ0、育成目的 |

### 進め方

- GitHub Projects（Board + Roadmap）でタスク・進捗管理
- 週1回の定例MTGで進捗確認・タスク割り振り
- PLが設計・基盤構築を行い、メンバーには簡単なタスクから渡す
- PR単位でコードレビューを実施

---

## 要件

### ユーザー種別と権限

| 種別 | できること |
|------|-----------|
| 新人 | 自分の日報を入力・編集・閲覧、メンター・OJTのコメントを閲覧 |
| メンター | 担当新人の日報閲覧、週次コメント入力 |
| OJT | 担当新人の日報閲覧、週次コメント入力 |
| 管理者 | 全日報閲覧、ユーザー管理、権限設定 |

### 閲覧権限ルール

- メンター・OJTは担当新人の日報のみ閲覧可能
- 管理者は全員の日報を閲覧可能
- SupabaseのRLS（Row Level Security）で制御する

### 基本機能（8月末までに完成）

1. **日報入力**: 新人が日報を入力・編集・閲覧（日付、出退勤時間、やったこと）
2. **メンターコメント**: メンター・OJTが担当新人の日報に対して週次コメントを入力
3. **管理者機能**: ユーザー管理、メンター割り当て、日報画面のプルダウンで全新人の日報を閲覧

### AI機能（余裕があれば8月末までに）

- 候補: 日報の入力補佐 or 日報の自動要約（未確定）

---

## 画面一覧

| # | 画面 | 対象ユーザー | 内容 |
|---|------|-------------|------|
| 1 | ログイン画面 | 全員 | メール・パスワード認証 |
| 2 | パスワードリセット画面 | 全員 | メールによるパスワード再設定 |
| 3 | 日報画面 | 全員 | 週単位の日報一覧・コメント。プルダウンの選択肢と操作がロールによって異なる共通画面 |
| 4 | 管理画面 | 管理者 | ユーザー管理、メンター割り当て |

---

## DBテーブル設計（概要）

| テーブル | 主な項目 |
|---------|---------|
| `profiles` | id(auth.users参照), employee_id, name, email, role(新人/メンター/OJT/管理者), is_active, created_at, updated_at |
| `daily_reports` | id, user_id(profiles参照), date, check_in, check_out, content, mood(1〜5), created_at, updated_at |
| `comments` | id, week_start, trainee_id(profiles参照), commenter_id(profiles参照), content, created_at, updated_at |
| `mentor_assignments` | id, trainee_id(profiles参照), mentor_id(profiles参照), ojt_id(profiles参照), year, created_at, updated_at |

> **設計方針**:
> - Supabaseでは認証情報は`auth.users`で管理し、アプリ固有情報は`profiles`テーブル（`public`スキーマ）で管理する
> - `comments`は週次単位（`week_start`）で管理。日報1件への紐付けではなく、担当新人への週次フィードバックとして設計する
> - 全テーブルに`created_at`・`updated_at`を追加する（Supabaseのデフォルトトリガーで自動管理）
> - `daily_reports.mood`は1〜5の任意入力（1=とても落ち込んでいる〜5=とても良い）。MS5の推移グラフで利用する

---

## リスク管理

| リスク | 影響 | 対策 |
|--------|------|------|
| Nuxt 4が安定版でない | ビルドエラー・Breaking Changeが発生する可能性 | マイナーバージョンを固定（`package.json`で`"nuxt": "4.x.x"`）。重大なバグが続く場合はNuxt 3へ切り替えを検討 |
| メンバーの学習が遅れる | MS2以降のタスクが詰まる | PLが先行してコンポーネントの骨格を作成し、メンバーには細部の実装から渡す。MS5（AI機能）を最初にスコープ削除の候補とする |
| Supabase無料枠の超過 | サービス停止 | 無料枠（500MB DB / 月2GB 転送）を定期確認。超過前に有料プランへ移行検討 |
| RLS設定ミスによる情報漏洩 | 他ユーザーの日報が見える | 統合テストでRLSを必ず確認。本番デプロイ前にPLがRLSを再検証する |

---

## テスト方針

### テスト構成

| レイヤー | 種別 | 対象 | ツール |
|---------|------|------|------|
| `server/api/` | ユニットテスト | APIハンドラーの入出力・バリデーション・エラー処理 | Vitest |
| `pages/` `components/` | ユニットテスト | UIの表示・操作（`$fetch` をモック） | Vitest + Vue Test Utils |
| RLS | 統合テスト | ロール別のアクセス制御 | 当面は MS 結合テストで手動確認（Vitest 実DB統合は将来） |
| 主要フロー | E2Eテスト | 日報入力→保存→閲覧、コメント入力など | Playwright（設定のみ・spec 未整備／当面後回し） |

### 各レイヤーの責務

**ユニットテスト（`server/api/`）**
- Supabase クライアントをモックし、ハンドラー単体で動作確認
- リクエストのバリデーション、レスポンスの形、エラー時のステータスコードを検証
- メンバーが書く場合は `$fetch` のモックのみで済む（Supabaseの知識不要）

**統合テスト（RLS）**
- テストユーザー（新人・メンター・OJT・管理者）を使って実DBに接続
- 担当外の日報が取得できないこと、コメントが自分の担当新人にしか書けないことを確認
- PLが各MSの結合テストとして実施

**E2Eテスト（Playwright）**
- 日報の入力→保存→一覧反映の一連フローを自動化
- 優先度の高いフロー（ログイン、日報CRUD、コメント入力）から着手
- 現状は `playwright.config`・seed のみ用意し（**spec は未整備**）、**当面は後回し**。主要フローの検証は当面 MS 結合テスト（手動）でカバーする

### テストの進め方

- MS2以降、PL が Server API のユニットテストを先行作成し、メンバーの実装参考例とする
- メンバーには「Vue コンポーネントのユニットテスト（`$fetch` モック）」から練習させる
- RLS の統合テストは各MS結合テストで PL が実施
- CI で `pnpm test` が必須（PR ゲート）。各 member PR は対象のユニットテスト（コンポーネント=`$fetch` モック／server=Supabase モック）を同梱し、CI（lint・型・test・build）green を DoD とする

---

## スケジュール・マイルストーン

### 全体スケジュール

| 時期 | フェーズ |
|------|----------|
| 4月下旬〜5月中旬 | MS1: 設計・準備 |
| 5月下旬〜6月 | MS2: 日報入力機能 |
| 7月上旬〜中旬 | MS3: 管理者機能 |
| 7月下旬〜8月前半 | MS4: メンターコメント機能（担当新人の日報閲覧＋週次コメント） |
| 8月後半 | MS5: AI機能 |

---

### MS1: 設計・準備（4/21〜5/16）

**PLタスク**

#### 1-1 GitHubリポジトリ作成（〜4/25）

- [ ] リポジトリ名を決める
- [ ] GitHubでPrivateリポジトリを作成
- [ ] README.mdに概要を記載
- [ ] メンバーをCollaboratorとして招待

#### 1-2 GitHub Projects作成・マイルストーン設定（〜4/25）

- [ ] Projectを新規作成
- [ ] Boardビュー設定（Todo / In Progress / Done）
- [ ] Roadmapビュー設定
- [ ] MS1〜MS5のマイルストーンを作成
- [ ] ラベル作成（PL / メンバー / バグ等）

#### 1-3 要件定義ドキュメント作成（〜4/30）

- [ ] `docs/requirements.md`を作成
- [ ] 背景・目的を記載
- [ ] ユーザー種別と権限を記載
- [ ] 機能一覧を記載
- [ ] 画面一覧を記載

#### 1-4 画面一覧・画面遷移図作成（〜5/2）

- [ ] 4画面の一覧を整理
- [ ] 画面遷移図を作成（Figma or Miro等）
- [ ] ロール別のアクセス可能画面を整理

#### 1-5 各画面のワイヤーフレーム作成（〜5/9）

- [ ] ログイン画面
- [ ] パスワードリセット画面
- [ ] 日報画面（新人用）：入力フォーム + 一覧のレイアウト
- [ ] 日報画面（メンター・OJT用）：一覧 + 詳細（インライン展開）・コメントのレイアウト
- [ ] 管理画面：タブ構成（ユーザー管理 / メンター割り当て）

#### 1-6 DBテーブル設計書作成（〜5/9）

- [ ] ER図を作成
- [ ] `profiles`テーブル定義（カラム、型、制約）
- [ ] `daily_reports`テーブル定義
- [ ] `comments`テーブル定義
- [ ] `mentor_assignments`テーブル定義

#### 1-7 RLS（権限）設計書作成（〜5/9）

- [ ] 新人：自分の日報のみ読み書き可能
- [ ] メンター・OJT：担当新人の日報のみ読み取り可能
- [ ] メンター・OJT：担当新人へのコメントのみ書き込み可能
- [ ] 管理者：全テーブル読み書き可能
- [ ] 各ポリシーのSQL文を記載

#### 1-8 Supabaseプロジェクト作成（〜5/12）

- [ ] Supabaseでプロジェクト新規作成（開発・本番の2プロジェクト）
- [ ] リージョン・プロジェクト名を設定
- [ ] API URLとanonキーを控える

#### 1-9 テーブル・RLS作成（〜5/14）

> 前提: 1-6, 1-7, 1-8 完了

- [x] 設計書に基づき`profiles`, `daily_reports`, `comments`, `mentor_assignments`テーブルを作成
- [x] `created_at`・`updated_at`の自動更新トリガーを設定（`handle_updated_at()`）
- [x] RLSポリシーを適用（`is_admin()`・`is_my_trainee()`ヘルパー含む）
- [ ] テストデータを投入して権限動作確認

#### 1-10 Nuxt 4プロジェクト初期化（〜5/12）

- [x] `npx nuxi init`でプロジェクト作成
- [x] ディレクトリ構成を整理（pages / components / composables / layouts）
- [x] ESLint・Prettier設定
- [x] Nuxtのバージョンを`package.json`で固定（`"nuxt": "4.4.2"`）
- [x] GitHubにpush

#### 1-11 Supabase接続設定（〜5/14）

> 前提: 1-8, 1-10 完了

- [x] `@nuxtjs/supabase`モジュールをインストール
- [x] 環境変数（.env）にSupabase URL・キーを設定（開発用）
- [x] 接続テスト（データ取得できるか確認）

#### 1-11a Server API 作成（PL 〜5/16）

> 前提: 1-11 完了。メンバーが MS2 で `$fetch` を呼べるよう、PLが先行して作成する。
> 骨格にとどまらず、バリデーション・エラーハンドリング込みのフル実装まで完了済み。MS3・MS4 で使う assignments・users API も先行して実装した。

- [x] `server/api/reports/` ディレクトリ構成を作成
- [x] `GET /api/reports` — 対象週の日報一覧取得ハンドラー
- [x] `POST /api/reports` — 日報作成ハンドラー
- [x] `PUT /api/reports/[id]` — 日報更新ハンドラー
- [x] `DELETE /api/reports/[id]` — 日報削除ハンドラー
- [x] `GET /api/comments` — 週次コメント取得ハンドラー
- [x] `PUT /api/comments` — 週次コメント保存ハンドラー（upsert）
- [x] `GET /api/assignments/me` — 担当新人/割り当て一覧取得ハンドラー（管理者・メンター機能で使用）
- [x] `PUT /api/assignments` — メンター割り当てハンドラー（管理者機能で使用）
- [x] `GET /api/users` `GET /api/users/me` `POST /api/users` `PUT /api/users/[id]` — ユーザー管理ハンドラー（管理者機能で使用）
- [x] 全ハンドラーに `serverSupabaseClient(event)` を使う雛形を記載
- [x] Vitestのセットアップ（`vitest.config.ts`）

#### 1-12 Cloudflare Pagesデプロイ設定（〜5/14）

> 前提: 1-10 完了

- [ ] Cloudflare PagesにGitHubリポジトリを連携
- [ ] ビルド設定（コマンド: `pnpm run build`、出力ディレクトリ: `dist`）
- [ ] 環境変数（`NUXT_PUBLIC_SUPABASE_URL`・`NUXT_PUBLIC_SUPABASE_KEY`）をCloudflare Pagesに設定
- [ ] デプロイ確認（トップページが表示されるか）
- [ ] プレビューデプロイ（PR作成時に自動でプレビュー環境が作られることを確認）

#### 1-13 認証（ログイン）機能実装（〜5/16）

> 前提: 1-11, 1-12 完了

- [ ] Supabase Authのメール認証設定（→ MS4前に対応）
- [ ] 管理者による招待メールでのユーザー作成フロー確認（→ 4-2で対応）
- [x] ログインページ（`pages/login.vue`）を作成
- [x] ログインフォーム（メール・パスワード）を実装
- [x] ログアウト機能を実装
- [x] パスワードリセットページを作成（`pages/reset-password.vue`）
- [x] 認証コールバックページを作成（`pages/confirm.vue`）
- [x] エラーページを作成（`error.vue`、404/500対応）
- [x] 認証ミドルウェアを設定（未ログイン→ログイン画面にリダイレクト）
- [x] ロール別表示制御（管理リンクはadminのみ表示、全員ログイン後は`/report`へ）

#### 1-14 CI/CD設定（〜5/16）

> 前提: 1-10, 1-12 完了

- [x] GitHub ActionsでESLint・型チェックを自動実行（PR時）（`.github/workflows/ci.yml`）
- [ ] mainブランチへのマージでCloudflare Pages本番デプロイが走ることを確認
- [x] `.env.example`を作成してリポジトリにコミット（実値は含めない）

**メンバータスク**

#### 1-M1 Git/GitHub基本操作の学習（〜5/2）

- [ ] Gitのインストール・初期設定
- [ ] clone / branch / commit / pushの基本操作を習得
- [ ] Pull Requestの作成・マージの流れを理解
- [ ] 練習用リポジトリで一連の流れを実践

#### 1-M2 開発環境構築（〜5/9）

- [ ] Node.js（LTS版）のインストール
- [ ] エディタ（VS Code推奨）のインストール
- [ ] VS Code拡張機能の導入（Vue、ESLint、Prettier等）
- [ ] プロジェクトをcloneしてローカルで起動確認

#### 1-M3 Nuxt 4チュートリアル実施（〜5/16）

- [ ] Vue 3の基本（テンプレート構文、リアクティビティ、コンポーネント）を学習
- [ ] Nuxtのページルーティングを理解
- [ ] Nuxtのコンポーネント作成を練習
- [ ] composablesの使い方を理解

> **サポート方針**: 5/9時点で進捗が50%未満の場合、PLがペアプログラミングでフォローする。MS2開始時に学習が完了していない場合は、PLが骨格コンポーネントを先行実装し、メンバーには細部の実装タスクを渡す。

---

### MS2: 日報入力機能（5/19〜6/30）

> **1サブタスク（`- [ ]`）= 1 PR**。各 PR はレビュー可能な1スライス（コンポーネント or 機能単位）。中の細目は `・` で示す PR 内の作業。動作確認だけの項目は結合テストに寄せる。**各 PR はユニットテストを含め、CI（lint・型・test・build）green を DoD とする。**

#### 2-1a ログイン・パスワードリセット画面のUI実装（メンバー 〜5/30）

> 認証は `server/api/auth/*` 経由で行う（ブラウザから Supabase を直接呼ばない）。

- [ ] **2-1a-a ログイン画面** — `login.vue` を共通 `AuthCard`（`app/components/common/AuthCard.vue`・新規作成、認証ページ共通カード／`reset-password` でも共用）＋ `UForm`/`UFormField`/`UInput`/`UButton` で実装・`$fetch('/api/auth/login')`＋`useApiError`・成功後 `navigateTo('/report', { external: true })`（`AuthCard` の新規作成も本タスクの範囲）
- [ ] **2-1a-b リセット画面** — `reset-password.vue`（1画面フォーム: メール＋コード送信／確認コード／新パスワード）・`/api/auth/reset-password` と `/api/auth/reset-password-otp` を接続
- [ ] **2-1a-c 仕上げ** — `confirm.vue` スタイリング＋全画面のレスポンシブ調整

#### 2-1 日報画面（新人用）のレイアウト（メンバー 〜5/30）

- [ ] **2-1-a 週ナビゲーション** — `WeekNavigator.vue`（前週/今週/次週）＋ `useWeekNavigation` で週状態を管理
- [ ] **2-1-b 週ジャンプ** — `WeekPickerModal.vue`（日付ピッカーで任意週へ移動）
- [ ] **2-1-c 週間リスト骨格** — 月〜金を `ReportRow.vue`（1日1行・曜日付き）で表示・レスポンシブ対応

#### 2-1b 共通レイアウト（ヘッダー/フッター）（メンバー 〜6/6）

> 全ページ共通の app shell。`useCurrentUser`（keyed `useAsyncData`）で氏名/ロールを表示。

- [ ] **2-1b-a 共通レイアウト** — `AppHeader.vue`（氏名/ロールバッジ表示・ログアウト・admin のみ管理ナビ／`useCurrentUser` 利用）＋ `AppFooter.vue` を `layouts/default.vue` に組み込む
  - 新規: `app/components/common/AppHeader.vue`・`app/components/common/AppFooter.vue`
  - 変更: `app/layouts/default.vue`

#### 2-1c ログイン中のパスワード変更（メンバー 〜6/6）

- [ ] **2-1c-a パスワード変更モーダル** — `PasswordChangeModal.vue`（`AppHeader` から起動・`LazyPasswordChangeModal` で遅延マウント）→ `$fetch('/api/auth/update-password')` を `useApiError` でラップ
  - 新規: `app/components/common/PasswordChangeModal.vue`
  - 変更: `app/components/common/AppHeader.vue`（起動ボタン追加）

#### 2-2 日報入力フォームUI（メンバー 〜6/6）

> `mood` は任意（1〜5）。`content`（やったこと）は Joy/Good/Next を含む自由記述テキスト（別フィールドではない）。検証は `UForm` ＋ `reportSchema`（`#shared/types/schemas`）。

- [ ] **2-2-a MoodStars コンポーネント** — `MoodStars.vue`（★5・任意・クリックで選択／再クリックで解除）。`ReportInputModal` と詳細表示で共用
- [ ] **2-2-b 日報入力モーダル** — `ReportInputModal.vue`（`components/report/`）に `:schema="reportSchema"`。日付は表示のみ・出退勤 Time Picker・やったこと textarea・気分（`MoodStars`）・送信ボタン（見た目のみ／API接続は2-3）

#### 2-3 日報保存 API 接続（メンバー 〜6/13）

- [ ] **2-3-a 日報保存の接続** — `$fetch('/api/reports', { method: 'POST', body })`・`useToast`（成功）／`useApiError`（409=同一日付重複）・送信後フォームリセット＋一覧再取得

#### 2-4 日報一覧・編集・削除（メンバー 〜6/20）

> 取得は `useWeeklyReports`（keyed `useAsyncData`）。`onMounted + $fetch` は使わない。

- [ ] **2-4-a 週次一覧表示** — `useWeeklyReports` で取得し `ReportRow`（1日1行・出退勤/気分/本文先頭）を一覧表示・週ナビ/週ジャンプ連動
- [ ] **2-4-b 編集** — 編集ボタン→モーダル→`PUT /api/reports/[id]`→一覧 refresh
- [ ] **2-4-c 削除** — 削除→`ConfirmDialog`→`DELETE /api/reports/[id]`→一覧 refresh（`ConfirmDialog` は確認ボタンを loading 中 `:disabled` にし二重送信を防ぐ）

#### 2-5 バリデーション仕上げ（メンバー 〜6/27）

- [ ] **2-5-a バリデーション仕上げ** — クライアント検証（必須=日付/出退勤/内容・出勤<退勤を `reportSchema` で）＋サーバーエラー表示（日付重複409 等の出し分け）

#### コードレビュー・修正（PL 随時）

- PR単位でレビューを実施する（Issue化しない）

#### 2-6 MS2結合テスト（PL+メンバー 〜6/30）

- [ ] 日報入力→保存→一覧表示の一連の流れを確認
- [ ] 編集→更新・削除の流れを確認
- [ ] バリデーションの動作確認
- [ ] 他ユーザーの日報が見えないことを確認（RLS）

---

### MS3: 管理者機能（7/1〜7/22）

> **MS4 より先に実施する**。先にユーザー作成とメンター・OJT 割り当てを用意しておくと、後続の MS4（担当新人の日報閲覧＋週次コメント）を実データで動かせる。
> 管理画面 `pages/admin.vue` はタブで「ユーザー管理 / メンター割り当て」を切り替える。コンポーネントは `components/admin/`（`UserTable` / `UserFormModal` / `AssignmentRow`）、データ取得・操作は composable（`useAdminUsers` / `useMentorAssignments`）に切り出す。
> 全ユーザー管理系 API は email を扱うためサーバー側で service role 経由（`NUXT_SUPABASE_SECRET_KEY` が必要）。各タスクは「1サブタスク = 1 PR」目安。各 PR はユニットテストを含め CI green を DoD とする。

#### 3-1 管理画面レイアウト・タブ（メンバー 〜7/4）

- [ ] **3-1-a 管理画面タブ枠** — `pages/admin.vue` にタブ切替UI（ユーザー管理 / メンター割り当て）とコンテンツ枠・管理者以外は `auth.global.ts` で `/report` にリダイレクトされることを確認

#### 3-2 ユーザー一覧テーブル（メンバー 〜7/8）

- [ ] **3-2-a ユーザー一覧テーブル** — `useAdminUsers` で `GET /api/users`（keyed `useAsyncData`）→ `UserTable.vue`（社員ID/名前/メール/役割バッジ `RoleBadge`/操作）。無効化行は半透明（opacity 0.45）・取得失敗は `useApiError`

#### 3-3 ユーザー招待（メンバー 〜7/12）

> 社員IDは**手入力（必須・自由形式・最大50文字）**。招待すると初期パスワード設定用の確認コード（OTP）メールが届く。

- [ ] **3-3-a ユーザー招待モーダル** — `UserFormModal.vue`（`UForm`＋`userCreateSchema`・追加モード）で社員ID・名前・メール・役割 → `POST /api/users`。409=メール重複/社員ID重複（`EMPLOYEE_ID_TAKEN`）を `useApiError` で出し分け・OTP メール送付確認

#### 3-4 ユーザー編集・無効化（メンバー 〜7/15）

- [ ] **3-4-a ユーザー編集・無効化** — `UserFormModal.vue` 編集モードで社員ID・名前・メール・役割 → `PUT /api/users/[id]`。「無効化」で `is_active:false`・「有効化」で再有効化

#### 3-5 Supabase Auth メール設定（PL 〜7/12）

- [ ] **3-5-a Auth メール設定** — `supabase/config.toml` で recovery テンプレ（`{{ .Token }}`=確認コード）と OTP 有効期限を設定・反映、本番は独自 SMTP（差出人・レート制限／`supabase/README.md` 参照）

#### 3-6 メンター・OJT割り当て機能（PL＋メンバー 〜7/18）

> UIに年度フィルターは設けない（`year` は現在年度で自動設定）。担当交代も既存レコードの UPDATE（upsert）で対応。

- [ ] **3-6-a 割り当て VM（composable）** — `useMentorAssignments` で `GET /api/assignments`＋ユーザー一覧から、全新人を網羅した編集行（`AssignmentRowVM`・未割り当ては null）とメンター/OJT 選択肢（`PersonOption`）を生成
  - 変更/新規: `app/composables/useMentorAssignments.ts`
- [ ] **3-6-b 割り当て行 UI ＋ 保存** — `AssignmentRow.vue` を `useMentorAssignments` の VM で描画 →「保存」で `$fetch('/api/assignments', { method: 'PUT', body })`（upsert）＋`useApiError`・保存後一覧 refresh
  - 新規: `app/components/admin/AssignmentRow.vue`

#### コードレビュー・修正（PL 随時）

- PR単位でレビューを実施する（Issue化しない）

#### 3-7 MS3結合テスト（PL+メンバー 〜7/22）

- [ ] ユーザー招待（社員ID手入力）→ OTP メール → `/reset-password` で初期PW設定 → ログインの流れ
- [ ] ユーザー編集・無効化/有効化が反映されることを確認
- [ ] メンター・OJT 割り当ての保存（upsert）が反映されることを確認
- [ ] 割り当て変更後、変更後のメンター・OJTが過去の日報も閲覧できることを確認（RLS）
- [ ] 管理者以外が管理画面にアクセスできないことを確認

---

### MS4: メンターコメント機能（担当新人の日報閲覧＋週次コメント）（7/23〜8/15）

> MS3 で作成したユーザー・割り当てを前提に、メンター・OJT・管理者が担当（管理者は全）新人の日報を `/report` で閲覧し週次コメントを行う。
> `/report`（`pages/report.vue`）はロール共通の1画面。コンポーネントは `components/report/` 配下、データ取得は composable（`useAssignedTrainees` / `useWeeklyReports` / `useWeeklyComments`）に切り出す。各タスクは「1サブタスク = 1 PR」目安。各 PR はユニットテストを含め CI green を DoD とする。

#### 4-1 担当新人セレクタ（メンバー 〜7/28）

- [ ] **4-1-a 担当新人セレクタ** — `TraineeSelector.vue`（`USelectMenu`・表示専用・非 trainee のみ）＋ `useAssignedTrainees` で `GET /api/assignments/me`→`traineeOptions`。既定選択は computed で導出（mentor/ojt 先頭・admin 未選択／watch(immediate) で後追いしない＝SSR hydration mismatch 回避）。担当0件は `EmptyState`「管理者にお問い合わせください」

#### 4-2 担当新人の週次日報の閲覧（メンバー 〜8/1）

- [ ] **4-2-a 週次日報閲覧** — `useWeeklyReports` を選択中 `userId`＋週で再取得（keyed `useAsyncData`・`server:false`＋mounted ゲート）・MS2 の `WeekNavigator`/`WeekPickerModal` を流用・月〜金の `ReportRow` 表示

#### 4-3 日報詳細のインライン展開（メンバー 〜8/5）

> 日報詳細はモーダルではなくインライン展開で実装する。

- [ ] **4-3-a 日報詳細インライン展開** — `ReportRow.vue` に展開/折りたたみトグル（報告がある日のみ）＋ `ReportRowDetail.vue` に詳細（出退勤・気分★・やったこと全文）を分離・キーボード/aria 対応

#### 4-4 週次コメントの表示・入力（メンバー 〜8/9）

> コメントは week_start 単位・1週1コメントの上書き（upsert）仕様。

- [ ] **4-4-a コメント表示** — `CommentArea.vue`（PC: 2カラム=メンター/OJT、SP: 1カラム）・`useWeeklyComments` で取得し `commenter.role` で振り分け・自ロールに一致する列だけ「入力/編集」ボタン
- [ ] **4-4-b コメント入力・保存** — `CommentInputModal.vue`（`UForm`＋`commentSchema`）→ `$fetch('/api/comments', { method: 'PUT', body })`＋`useApiError`・成功トースト・コメントエリア更新

#### 4-5 管理者の全新人セレクタ（メンバー 〜8/11）

> 管理者の日報閲覧は管理画面ではなく `/report` のセレクタで全新人を選択する仕様。

- [ ] **4-5-a 管理者の全新人セレクタ** — admin では `TraineeSelector` の選択肢を全新人（`is_active=true`・role=trainee）に・初期状態は未選択（「表示したい新人の日報を選んでください」を表示）

#### 4-6 RLS で担当新人の日報のみ閲覧制限（PL 〜8/13）

- [ ] `daily_reports` の SELECT ポリシーにメンター・OJT 向けルール（`is_my_trainee`）を確認
- [ ] `comments` の INSERT/UPDATE/SELECT ポリシーを確認
- [ ] 担当外の新人の日報・コメントにアクセスできないことをテストデータで確認

#### コードレビュー・修正（PL 随時）

- PR単位でレビューを実施する（Issue化しない）

#### 4-7 MS4結合テスト（PL+メンバー 〜8/15）

- [ ] メンターが担当新人の日報一覧を閲覧でき、インライン展開・折りたたみが動作することを確認
- [ ] 週次コメントの入力→保存→表示（上書き）の流れを確認
- [ ] 管理者で `/report` のセレクタから全新人の日報が閲覧できることを確認
- [ ] 担当外の新人の日報・コメントが見えないことを確認（OJTも同様）

---

### 共通化リファクタ（各実装完了後）

> MS2〜MS4 で各機能を**具体的に実装した後**に、繰り返し現れた共通処理を共通部品へ抽出する（先に実装 → 重複が出てから集約＝rule of three）。挙動は変えず、対象の既存テストが green のままを受け入れ基準とする。各 PR はテストを含め CI green を DoD とする。owner は別途割当（共通部品の理解を兼ね member の学習課題にもできる）。

- [ ] **R-1 useModalForm 抽出**（前提: 2-2-b・3-3-a/3-4-a・4-4-b 完了）— 入力モーダル3本の共通 lifecycle（open リセット＋submit の loading/try-catch/`useApiError`）を集約。ドメインロジック（mood 変換・OTP・role 制限・Zod スキーマ）は各モーダルに残す
  - 新規: `app/composables/useModalForm.ts`
  - 変更: `app/components/report/ReportInputModal.vue`・`app/components/report/CommentInputModal.vue`・`app/components/admin/UserFormModal.vue`
- [ ] **R-2 usePageLoading 抽出**（前提: report/admin の pending 実装完了）— `!mounted || …Pending` の boolean 群を集約しテンプレートの条件を簡潔化
  - 新規: `app/composables/usePageLoading.ts`
  - 変更: `app/pages/report.vue`・`app/pages/admin.vue`
- [ ] **R-3 assertAdminRole 抽出**（前提: 1-11a users ハンドラ完了）— users 系ハンドラの重複した admin gate（role 取得→403）を server util へ集約
  - 新規/変更: `server/utils/auth.ts`（`assertAdminRole` 追加）・`server/api/users/index.get.ts`・`index.post.ts`・`server/api/users/[id]/index.put.ts` ＋ util 単体テスト
- [ ] **R-4 useLazyOpen 抽出**（前提: 2-1c・3-1-a/3-3-a・4-2-a の各モーダル/ページ設置完了）— モーダル等の遅延マウント latch（`open` が一度 true になったらマウントを維持）を各ホストの inline `watch` から共通 composable へ集約。`v-if` で Lazy コンポーネントのチャンク取得を初回オープンまで遅延
  - 新規: `app/composables/useLazyOpen.ts`
  - 変更: `app/components/common/AppHeader.vue`・`app/pages/admin.vue`・`app/pages/report.vue`
- [ ] **R-5 asyncDataCache 抽出**（前提: keyed `useAsyncData` 系 composable 完了）— `getCachedData`/`reuseAsyncData` のキャッシュ設定（タブ切替の重複取得・purge 対策）を共通 util へ集約
  - 新規: `app/utils/asyncDataCache.ts`
  - 変更: `app/composables/useCurrentUser.ts`・`app/composables/useAdminUsers.ts`・`app/composables/useAssignedTrainees.ts`・`app/composables/useMentorAssignments.ts`
- [ ] **R-6 option 正規化共通化**（前提: 3-6-a・4-1-a 完了）— `PersonOption`/`TraineeOption` の `{ id, name }` 正規化と型を統一
  - 変更: `app/composables/useMentorAssignments.ts`・`app/composables/useAssignedTrainees.ts`・`shared/types/api.ts`

---

### MS5: AI機能（8/16〜8/31）

> **基本方針（IDEA_2より）**: AIは代筆しない。振り返りを引き出すコーチ役に徹する。本文は必ず本人が入力する。

#### 5-1 AI機能の仕様確定（PL 〜8/18）

- [ ] 実装する機能の優先順位を決定（下記3候補から）
  - 候補A: **新人向けコーチング**（入力ヒント・質問提示・ポジティブフィードバック）
  - 候補B: **メンター向け週次サマリー**（1週間の傾向を参考情報として表示）
  - 候補C: **過去事例参照**（類似の悩みを持った人の傾向を提示）※個人特定しない
- [ ] 使用するAI API（Claude API等）を選定
- [ ] プロンプト設計（禁止事項: 日報全文の自動生成、ボタン一つで完成文を作る機能）
- [ ] UI/UXの方針を決定

#### 5-2 API連携実装（バックエンド）（PL 〜8/22）

- [ ] Supabase Edge Functionを作成
- [ ] AI APIへのリクエスト処理を実装
- [ ] APIキーのセキュアな管理（環境変数）
- [ ] レスポンスのパース処理
- [ ] エラーハンドリング

#### 5-3 新人向けコーチングUI（メンバー 〜8/25）

- [ ] 入力フォームに「ヒントを見る」ボタンを配置
- [ ] AIが質問を提示するUI（例：「今日うまくいった小さなことはありましたか？」）
- [ ] 入力後のポジティブフィードバック表示
- [ ] ローディング表示・エラー表示

#### 5-4 メンター向けサマリーUI（メンバー 〜8/27）

- [ ] メンター画面に週次サマリーエリアを追加（任意表示）
- [ ] AIによる傾向サマリーの表示（例：「今週は挑戦に関する記述が多い」）
- [ ] moodの推移グラフ表示（1〜5の週次変化）

#### 5-5 テスト・調整（PL+メンバー 〜8/31）

- [ ] AI機能の動作確認
- [ ] レスポンス品質の確認・プロンプト調整
- [ ] AIが日報を代筆していないことの確認（設計方針の遵守）
- [ ] エラー時の挙動確認
- [ ] 全機能の最終確認

---

## 週1定例でやること

| 確認項目 | 内容 |
|---------|------|
| 進捗確認 | GitHub ProjectsのBoard確認 |
| 今週の振り返り | 完了タスク、ブロッカーの共有 |
| 来週のタスク | 次に着手するIssueを割り振り |
| メンバーフォロー | 困りごと、学習の進み具合 |

