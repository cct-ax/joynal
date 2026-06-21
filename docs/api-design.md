---
description: API 共通仕様・エラー形式・エンドポイント索引（詳細は OpenAPI / Scalar が一次情報）。
---

# API設計書

このページで分かること: API の共通方針、レスポンス/エラー形式、エンドポイント索引。各エンドポイントの詳細は OpenAPI（Scalar）が一次情報。

> 関連: [アーキテクチャ](./architecture.md) ・ [DB 設計](./db-design.md) ・ [用語集](./glossary.md)

本書は API の**方針・共通仕様の概要**をまとめたもの。
各エンドポイントの詳細（リクエスト/レスポンス/エラー）は、コードから自動生成される**インタラクティブな OpenAPI ドキュメント**を一次情報とする。

> **API ドキュメントの見方（基本は Scalar）**
> - `pnpm dev` 起動後 → **http://localhost:3000/_scalar**（Scalar UI・叩いて試せる）
> - 生の OpenAPI spec が要るとき → `/_openapi.json`（Swagger UI 版も同 spec で `/_swagger` にあり）
> - **dev 限定**（本番では非公開）。spec は各 `server/api` ハンドラの `defineRouteMeta` から自動生成される。

---

## 基本方針

- すべてのエンドポイントは `/api/` プレフィックスを持つ
- フロントは Supabase を直接呼ばず、必ず `server/api/*` 経由。`serverSupabaseClient` がユーザーの JWT を転送し、Supabase RLS が自動適用される
- 認証は Cookie の JWT を自動で引き継ぐ（`@nuxtjs/supabase` が処理）
- レスポンスは常に JSON
- エラー時は HTTP ステータスコード + `{ message: string }` を返す

---

## 共通レスポンス形式

### 成功時

```json
// 単一リソース
{ "id": "uuid", ... }

// リスト
[{ "id": "uuid", ... }, ...]

// 削除・更新で返すものがない場合
null  // 204 No Content
```

### エラー時

```json
{ "message": "エラーの説明" }
```

一部のエラーは機械判別用の `code` を伴う（例: `EMPLOYEE_ID_TAKEN`、`SAME_PASSWORD`）。どのエンドポイントで返るかは OpenAPI を参照。

### 共通エラーコード

| ステータス | 意味 | 発生ケース |
|----------|------|---------|
| 400 | Bad Request | バリデーションエラー（必須項目不足、時間の前後関係など） |
| 401 | Unauthorized | 未ログイン（`@nuxtjs/supabase` が自動処理） |
| 403 | Forbidden | RLS によるアクセス拒否（担当外の日報など） |
| 404 | Not Found | 対象リソースが存在しない |
| 409 | Conflict | 重複（同じ日付の日報、メール／社員ID の重複など） |
| 422 | Unprocessable Entity | 新パスワードが現在と同一（`SAME_PASSWORD`）など |
| 500 | Internal Server Error | DB エラーなど予期しないエラー |

---

## ユーザーロールとアクセス権

権限は **Supabase RLS で強制**する（フロントのガードだけに依存しない）。各エンドポイントの「対象ロール」概要は以下のとおり。

| ロール | 日報 | 週次コメント | 担当割り当て | ユーザー管理 |
|--------|------|------------|------------|------------|
| `trainee`（新人） | 自分の日報を作成/更新/削除・閲覧 | 自分宛を閲覧 | — | 自分のプロフィールのみ |
| `mentor` / `ojt` | 担当新人の日報を閲覧 | 担当新人へコメント（作成/編集）・閲覧 | 自分の担当を閲覧 | 自分のプロフィールのみ |
| `admin`（管理者） | 全員の日報を閲覧 | 全員のコメントを閲覧 | 全割り当てを閲覧・編集 | ユーザー一覧/招待/更新 |

---

## エンドポイント一覧（索引）

詳細（パラメータ・ボディ・レスポンス・エラー）は OpenAPI（`/_scalar`）を参照。

| タグ | メソッド | パス | 概要 | 対象ロール |
|------|---------|------|------|----------|
| reports | GET | `/api/reports` | 週の日報一覧取得 | 全ロール（範囲は RLS） |
| reports | POST | `/api/reports` | 日報作成 | 新人 |
| reports | PUT | `/api/reports/:id` | 日報更新 | 新人（自分のみ） |
| reports | DELETE | `/api/reports/:id` | 日報削除 | 新人（自分のみ） |
| reports | GET | `/api/reports/mood-trend` | 期間の日次 mood 推移取得（mood 未入力日は除外） | 全ロール（範囲は RLS） |
| ai | POST | `/api/ai/coach` | 新人コーチング（振り返りの質問＋短評・代筆なし） | 全ロール（主に新人） |
| ai | GET | `/api/ai/weekly-summary` | 週次サマリー取得（キャッシュ＋鮮度判定用 max(updated_at)） | 新人＝自分・mentor/ojt/admin＝担当新人 |
| ai | POST | `/api/ai/weekly-summary` | 週次サマリー生成 / 再生成（**SSE ストリーミング**） | 新人＝自分・mentor/ojt/admin＝担当新人 |
| comments | GET | `/api/comments` | 週次コメント取得 | 全ロール（範囲は RLS） |
| comments | PUT | `/api/comments` | 週次コメント保存（upsert） | メンター・OJT |
| assignments | GET | `/api/assignments/me` | 担当新人一覧取得 | メンター・OJT・管理者 |
| assignments | PUT | `/api/assignments` | メンター割り当て更新（upsert） | 管理者 |
| users | GET | `/api/users/me` | 自分のプロフィール取得（email 除外） | 全ログインユーザー |
| users | GET | `/api/users` | ユーザー一覧取得 | 管理者 |
| users | POST | `/api/users` | ユーザー招待 | 管理者 |
| users | PUT | `/api/users/:id` | ユーザー更新 | 管理者 |
| auth | POST | `/api/auth/login` | ログイン | 全員 |
| auth | POST | `/api/auth/logout` | ログアウト | 全員 |
| auth | POST | `/api/auth/reset-password` | リセット用コード送信 | 未認証可 |
| auth | POST | `/api/auth/reset-password-otp` | コード検証＋新パスワード設定 | 未認証可 |
| auth | POST | `/api/auth/update-password` | ログイン中のパスワード変更 | 全ログインユーザー |

> 認証系の成功レスポンスはいずれも `204 No Content`（ボディなし）。セッションは `@supabase/ssr` の Cookie アダプタが Set-Cookie で管理する。

---

## フロントエンドからの呼び出し例

app 側の使い方ガイド（OpenAPI には無い情報）。

```typescript
// 日報一覧取得
const reports = await $fetch('/api/reports', {
  query: { weekStart: '2026-05-19', userId: traineeId }
})

// 日報作成
const report = await $fetch('/api/reports', {
  method: 'POST',
  body: { date: '2026-05-19', check_in: '09:00', check_out: '18:00', content: '...' }
})

// 日報更新
await $fetch(`/api/reports/${reportId}`, {
  method: 'PUT',
  body: { content: '更新後の本文' }
})

// 日報削除
await $fetch(`/api/reports/${reportId}`, { method: 'DELETE' })

// mood 推移取得（メンター向け週次サマリーのグラフ用。期間 from〜to ＋ 任意 userId）
const moodTrend = await $fetch('/api/reports/mood-trend', {
  query: { from: '2026-03-30', to: '2026-05-22', userId: traineeId }
})

// AI コーチング（入力中ドラフト＋気分から振り返りの質問＋短評。本文の代筆はしない）
// 上流 AI 失敗・応答不正は 502（data.code = 'AI_UPSTREAM_ERROR'）
const coach = await $fetch('/api/ai/coach', {
  method: 'POST',
  body: { content: '今日は API を実装した。テストで詰まった。', mood: 3 }
})
// → { questions: ['...', '...'], feedback: '...' }

// 週次サマリー取得（キャッシュ）。summary が null なら未生成。
// 鮮度（再生成要否）は summary.sourceUpdatedAt < latestReportUpdatedAt で判定する
const weekly = await $fetch('/api/ai/weekly-summary', {
  query: { userId: traineeId, weekStart: '2026-05-18' }
})

// 週次サマリー生成 / 再生成（SSE ストリーミング）。
// 事前チェック（未認証 401・不正ボディ 400・日報なし 422・レート上限 429）は
// ストリーム開始前に通常の HTTP ステータスで返す。HTTP 200（SSE 開始）後の AI 上流失敗は
// error イベントで通知する。生成トークンは delta で逐次届き、done で本文確定＋ai_summaries に保存。
const stream = await $fetch('/api/ai/weekly-summary', {
  method: 'POST',
  body: { userId: traineeId, weekStart: '2026-05-18' },
  responseType: 'stream'
})
for await (const frame of readSseStream(stream)) {
  // event: 'delta' → { text }          … 生成トークン片（連結して全文に）
  // event: 'done'  → { audience, sourceUpdatedAt } … 完了メタ（鮮度基準）
  // event: 'error' → { message, code } … AI 上流失敗
}

// コメント保存
await $fetch('/api/comments', {
  method: 'PUT',
  body: { weekStart: '2026-05-19', traineeId, content: '...' }
})

// メンター割り当て更新
await $fetch('/api/assignments', {
  method: 'PUT',
  body: { traineeId, mentorId, ojtId }
})

// ログインユーザー自身のプロフィール（useCurrentUser が内部で利用）
const me = await $fetch('/api/users/me')

// ユーザー一覧取得（管理者）
const users = await $fetch('/api/users')

// ユーザー招待（管理者）— 社員IDは手入力
await $fetch('/api/users', {
  method: 'POST',
  body: { employee_id: 'E001', name: '新しい社員', email: 'new@example.com', role: 'trainee' }
})

// ユーザー更新（管理者）
await $fetch(`/api/users/${userId}`, {
  method: 'PUT',
  body: { is_active: false }
})

// ログイン（成功後はセッション反映のためフルリロードする）
await $fetch('/api/auth/login', {
  method: 'POST',
  body: { email: 'user@example.com', password: '...' }
})

// パスワードリセット: コード送信 → コード検証＋新パスワード設定
await $fetch('/api/auth/reset-password', { method: 'POST', body: { email } })
await $fetch('/api/auth/reset-password-otp', {
  method: 'POST',
  body: { email, token: '123456', password: '...' }
})
```
