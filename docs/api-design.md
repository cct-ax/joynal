# API設計書

## 基本方針

- すべてのエンドポイントは `/api/` プレフィックスを持つ
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
{
  "message": "エラーの説明"
}
```

### 共通エラーコード

| ステータス | 意味 | 発生ケース |
|----------|------|---------|
| 400 | Bad Request | バリデーションエラー（必須項目不足、時間の前後関係など） |
| 401 | Unauthorized | 未ログイン（`@nuxtjs/supabase` が自動処理） |
| 403 | Forbidden | RLS によるアクセス拒否（担当外の日報など） |
| 404 | Not Found | 対象リソースが存在しない |
| 500 | Internal Server Error | DB エラーなど予期しないエラー |

---

## エンドポイント一覧

---

### 日報 `/api/reports`

#### `GET /api/reports` — 週の日報一覧取得

**対象ロール**: 全員（新人は自分の、メンター・OJTは担当新人の、管理者は全員の）

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|:---:|------|
| `weekStart` | `string` (YYYY-MM-DD) | ○ | 取得対象週の月曜日 |
| `userId` | `string` (UUID) | △ | 取得対象のユーザーID。新人は省略（自分のみ）、メンター・OJT・管理者は必須 |

**レスポンス** `200 OK`

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "date": "2026-05-19",
    "check_in": "09:00:00",
    "check_out": "18:00:00",
    "content": "やったことの本文",
    "mood": 4,
    "created_at": "2026-05-19T09:00:00Z",
    "updated_at": "2026-05-19T09:00:00Z"
  }
]
```

**エラー**

| ステータス | 条件 |
|----------|------|
| 400 | `weekStart` が未指定または不正な日付形式 |
| 403 | `userId` が担当外の新人（RLS による） |

---

#### `POST /api/reports` — 日報作成

**対象ロール**: 新人のみ

**リクエストボディ**

```json
{
  "date": "2026-05-19",
  "check_in": "09:00",
  "check_out": "18:00",
  "content": "やったことの本文",
  "mood": 4
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|:---:|------|
| `date` | `string` (YYYY-MM-DD) | ○ | 日報の日付 |
| `check_in` | `string` (HH:MM) | ○ | 出勤時間 |
| `check_out` | `string` (HH:MM) | ○ | 退勤時間 |
| `content` | `string` | ○ | やったこと |
| `mood` | `number` (1〜5) | × | 気分 |

**レスポンス** `201 Created`

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "date": "2026-05-19",
  "check_in": "09:00:00",
  "check_out": "18:00:00",
  "content": "やったことの本文",
  "mood": 4,
  "created_at": "2026-05-19T09:00:00Z",
  "updated_at": "2026-05-19T09:00:00Z"
}
```

**エラー**

| ステータス | 条件 |
|----------|------|
| 400 | 必須項目不足 / `check_out <= check_in` / 不正な日付形式 |
| 403 | 新人以外のロールが呼び出した（RLS による） |
| 409 | 同じ日付の日報が既に存在する |

---

#### `PUT /api/reports/:id` — 日報更新

**対象ロール**: 新人のみ（自分の日報のみ）

**リクエストボディ** （変更したいフィールドのみ。`date` は変更不可）

```json
{
  "check_in": "09:30",
  "check_out": "18:30",
  "content": "更新後の本文",
  "mood": 3
}
```

**レスポンス** `200 OK` — 更新後のレコード（`POST` と同じ形式）

**エラー**

| ステータス | 条件 |
|----------|------|
| 400 | `check_out <= check_in` / 不正な値 |
| 403 | 他ユーザーの日報を更新しようとした（RLS による） |
| 404 | 対象の日報が存在しない |

---

#### `DELETE /api/reports/:id` — 日報削除

**対象ロール**: 新人のみ（自分の日報のみ）

**リクエストボディ**: なし

**レスポンス** `204 No Content`

**エラー**

| ステータス | 条件 |
|----------|------|
| 403 | 他ユーザーの日報を削除しようとした（RLS による） |
| 404 | 対象の日報が存在しない |

---

### コメント `/api/comments`

#### `GET /api/comments` — 週次コメント取得

**対象ロール**: 全員（新人は自分宛の、メンター・OJTは担当新人宛の、管理者は全員の）

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|:---:|------|
| `weekStart` | `string` (YYYY-MM-DD) | ○ | 対象週の月曜日 |
| `traineeId` | `string` (UUID) | ○ | 対象新人のユーザーID |

**レスポンス** `200 OK`

```json
[
  {
    "id": "uuid",
    "week_start": "2026-05-19",
    "trainee_id": "uuid",
    "commenter_id": "uuid",
    "commenter": {
      "name": "田中 太郎",
      "role": "mentor"
    },
    "content": "今週もよく頑張りました。",
    "created_at": "2026-05-23T18:00:00Z",
    "updated_at": "2026-05-23T18:00:00Z"
  }
]
```

**エラー**

| ステータス | 条件 |
|----------|------|
| 400 | `weekStart` または `traineeId` が未指定 |
| 403 | 担当外の新人のコメントを取得しようとした（RLS による） |

---

#### `PUT /api/comments` — 週次コメント保存（upsert）

**対象ロール**: メンター・OJTのみ

> 同じ `(weekStart, traineeId, commenterId)` の組み合わせが既に存在する場合は上書き（UPDATE）。存在しない場合は新規作成（INSERT）。

**リクエストボディ**

```json
{
  "weekStart": "2026-05-19",
  "traineeId": "uuid",
  "content": "今週のコメント本文"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|:---:|------|
| `weekStart` | `string` (YYYY-MM-DD) | ○ | 対象週の月曜日 |
| `traineeId` | `string` (UUID) | ○ | コメント対象の新人ID |
| `content` | `string` | ○ | コメント本文 |

**レスポンス** `200 OK` — 保存後のレコード（`commenter` フィールドなしの単一オブジェクト）

**エラー**

| ステータス | 条件 |
|----------|------|
| 400 | 必須項目不足 |
| 403 | 担当外の新人へのコメント / メンター・OJT以外のロール（RLS による） |

---

### アサイン `/api/assignments`

#### `GET /api/assignments/me` — 担当新人一覧取得

**対象ロール**: メンター・OJT（自分の担当新人）、管理者（全新人の割り当て情報）

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|:---:|------|
| `year` | `number` | × | 年度（省略時は現在の年度） |

**レスポンス** `200 OK`

メンター・OJT の場合（担当新人のみ）:

```json
[
  {
    "trainee_id": "uuid",
    "year": 2026,
    "trainee": {
      "name": "山田 花子",
      "employee_id": "E001"
    }
  }
]
```

管理者の場合（全割り当て情報）:

```json
[
  {
    "trainee_id": "uuid",
    "mentor_id": "uuid",
    "ojt_id": "uuid",
    "year": 2026,
    "trainee": { "name": "山田 花子" },
    "mentor": { "name": "田中 一郎" },
    "ojt": { "name": "佐藤 美咲" }
  }
]
```

**エラー**

| ステータス | 条件 |
|----------|------|
| 403 | 新人ロールが呼び出した |

---

#### `PUT /api/assignments` — メンター割り当て更新（upsert）

**対象ロール**: 管理者のみ

> `(trainee_id, year)` の組み合わせが既に存在する場合は上書き（UPDATE）。存在しない場合は新規作成（INSERT）。`year` は省略時に現在年度を自動セットする。

**リクエストボディ**

```json
{
  "traineeId": "uuid",
  "mentorId": "uuid",
  "ojtId": "uuid",
  "year": 2026
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|:---:|------|
| `traineeId` | `string` (UUID) | ○ | 対象の新人ID |
| `mentorId` | `string` (UUID) \| `null` | ○ | メンターID（未割り当ての場合は null） |
| `ojtId` | `string` (UUID) \| `null` | ○ | OJT担当者ID（未割り当ての場合は null） |
| `year` | `number` | × | 年度（省略時は現在の年度） |

**レスポンス** `200 OK` — 保存後のレコード

**エラー**

| ステータス | 条件 |
|----------|------|
| 400 | `traineeId` が未指定 |
| 403 | 管理者以外のロールが呼び出した（RLS による） |
| 404 | `traineeId` / `mentorId` / `ojtId` が存在しない |

---

### ユーザー管理 `/api/users`

#### `GET /api/users` — ユーザー一覧取得

**対象ロール**: 管理者のみ

**レスポンス** `200 OK`

```json
[
  {
    "id": "uuid",
    "employee_id": "E001",
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "role": "trainee",
    "is_active": true,
    "created_at": "2026-04-01T00:00:00Z",
    "updated_at": "2026-04-01T00:00:00Z"
  }
]
```

**エラー**

| ステータス | 条件 |
|----------|------|
| 403 | 管理者以外のロールが呼び出した |

---

#### `POST /api/users` — ユーザー招待

**対象ロール**: 管理者のみ

> Supabase Auth にユーザーを作成し、`profiles` テーブルにレコードを挿入する。`employee_id` は自動採番。

**リクエストボディ**

```json
{
  "name": "新しい 社員",
  "email": "new@example.com",
  "role": "trainee"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|:---:|------|
| `name` | `string` | ○ | 表示名 |
| `email` | `string` | ○ | メールアドレス（Supabase Auth に登録） |
| `role` | `string` | ○ | `trainee` / `mentor` / `ojt` / `admin` |

**レスポンス** `201 Created` — 作成後の profiles レコード

**エラー**

| ステータス | 条件 |
|----------|------|
| 400 | 必須項目不足 / 不正な role |
| 403 | 管理者以外のロールが呼び出した |
| 409 | 同じメールアドレスが既に存在する |

---

#### `PUT /api/users/:id` — ユーザー更新

**対象ロール**: 管理者のみ

**リクエストボディ** （変更したいフィールドのみ）

```json
{
  "name": "更新後の名前",
  "email": "updated@example.com",
  "role": "mentor",
  "is_active": false
}
```

**レスポンス** `200 OK` — 更新後の profiles レコード

> `is_active: false` に更新した場合、Supabase Auth 側でもユーザーを ban してログイン不可にする。

**エラー**

| ステータス | 条件 |
|----------|------|
| 400 | 不正な role |
| 403 | 管理者以外のロールが呼び出した |
| 404 | 対象ユーザーが存在しない |

---

## フロントエンドからの呼び出し例

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

// ユーザー一覧取得（管理者）
const users = await $fetch('/api/users')

// ユーザー招待（管理者）
await $fetch('/api/users', {
  method: 'POST',
  body: { name: '新しい社員', email: 'new@example.com', role: 'trainee' }
})

// ユーザー更新（管理者）
await $fetch(`/api/users/${userId}`, {
  method: 'PUT',
  body: { is_active: false }
})
```
