# コーディング規約

> メンバー向けのガイドです。わからないことがあれば PL に聞いてください。

---

## TypeScript

### アロー関数を使う

関数はアロー関数で定義する。`function` キーワードは使わない。

```typescript
// ✗ 悪い例
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// ✓ よい例
const formatDate = (date: Date): string => {
  return date.toISOString().slice(0, 10)
}

// 1行で書ける場合は波括弧と return を省略してよい
const formatDate = (date: Date): string => date.toISOString().slice(0, 10)
```

> **例外**: `defineEventHandler` / `defineNuxtRouteMiddleware` など Nuxt が提供するラッパー関数のコールバックはアロー関数で書く（これは Nuxt の慣例どおり）。

---

### 型は明示する

関数の引数と戻り値には必ず型を書く。ローカル変数は推論に任せてよい。

```typescript
// ✗ 悪い例
const formatDate = (date) => date.toISOString().slice(0, 10)

// ✓ よい例
const formatDate = (date: Date): string => date.toISOString().slice(0, 10)
```

### `any` は使わない

型がわからない場合は `unknown` を使い、安全に絞り込む。

```typescript
// ✗ 悪い例
const handleError = (error: any) => {
  console.error(error.message)
}

// ✓ よい例
const handleError = (error: unknown): string => {
  if (error instanceof Error) return error.message
  return '予期しないエラーが発生しました'
}
```

---

## 型定義の管理

### `app/types/` に集約する

型・インターフェース・Zod スキーマはすべて `app/types/` に置く。コンポーネントや composable の中にインラインで型を定義しない。

```
app/types/
├── database.types.ts   # Supabase 自動生成（編集禁止）
├── models.ts           # DB テーブル型のエイリアス
├── api.ts              # API リクエスト・レスポンスの型
└── schemas.ts          # Zod スキーマ（フォームバリデーション用）
```

### `database.types.ts` は編集しない

自動生成ファイルのため直接書き換えない。`pnpm supabase:types` で再生成する。
DB の型を使いたい場合は `models.ts` でエイリアスを定義してそこからインポートする。

```typescript
// app/types/models.ts
import type { Tables, Insert, Update } from '~/types/database.types'

export type DailyReport = Tables<'daily_reports'>
export type DailyReportInsert = Insert<'daily_reports'>
export type DailyReportUpdate = Update<'daily_reports'>

export type Comment = Tables<'comments'>
export type Profile = Tables<'profiles'>
```

```typescript
// コンポーネント側
import type { DailyReport } from '~/types/models'
```

### API の型は `api.ts` に書く

Server API のリクエスト・レスポンスに使う型はここに集める。

```typescript
// app/types/api.ts
export type ReportCreateBody = {
  date: string
  check_in: string
  check_out: string
  content: string
  mood?: 1 | 2 | 3 | 4 | 5
}

export type CommentUpsertBody = {
  weekStart: string
  traineeId: string
  content: string
}
```

### Zod スキーマは `schemas.ts` に書く

フォームのバリデーションルールは `schemas.ts` に集約する。型は `z.infer` / `z.output` で導出し、手動で定義しない。

```typescript
// app/types/schemas.ts
import { z } from 'zod'

export const reportSchema = z.object({
  date: z.string().min(1, '日付は必須です'),
  check_in: z.string().min(1, '出勤時間は必須です'),
  check_out: z.string().min(1, '退勤時間は必須です'),
  content: z.string().min(1, 'やったことは必須です'),
  mood: z.number().int().min(1).max(5).optional()
})

export const commentSchema = z.object({
  content: z.string().min(1, 'コメントは必須です')
})

// 型はスキーマから導出する（手動定義しない）
export type ReportSchema = z.output<typeof reportSchema>
export type CommentSchema = z.output<typeof commentSchema>
```

```typescript
// コンポーネント側
import { reportSchema, type ReportSchema } from '~/types/schemas'
```

### `type` と `interface` の使い分け

このプロジェクトでは **`type` を基本** とする。

| 使うもの | ケース |
|---------|-------|
| `type` | DB型のエイリアス、API型、Zod から導出した型、ユニオン型 |
| `interface` | 将来的に拡張（`extends`）が必要なオブジェクト型のみ |

```typescript
// ✓ type を基本として使う
export type UserRole = 'trainee' | 'mentor' | 'ojt' | 'admin'
export type DailyReport = Tables<'daily_reports'>

// ✓ interface は extends が必要なときだけ
interface BaseModal {
  isOpen: boolean
}
interface ReportModal extends BaseModal {
  reportId: string
}
```

---

## Vue コンポーネント

### `<script setup>` を使う

Options API は使わない。すべて `<script setup lang="ts">` で書く。

```vue
<!-- ✗ 悪い例 -->
<script lang="ts">
export default {
  data() { return { count: 0 } }
}
</script>

<!-- ✓ よい例 -->
<script setup lang="ts">
const count = ref(0)
</script>
```

### props と emits は型定義する

```vue
<script setup lang="ts">
const props = defineProps<{
  reportId: string
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  saved: [reportId: string]
}>()
</script>
```

### テンプレートはシンプルに保つ

ロジックはテンプレートに書かず、`computed` や関数に切り出す。

```vue
<!-- ✗ 悪い例 -->
<template>
  <span>{{ reports.filter(r => r.date === today).length > 0 ? '入力済み' : '未入力' }}</span>
</template>

<!-- ✓ よい例 -->
<script setup lang="ts">
const hasReportToday = computed(() =>
  reports.value.some(r => r.date === today)
)
</script>
<template>
  <span>{{ hasReportToday ? '入力済み' : '未入力' }}</span>
</template>
```

### `v-if` と `v-for` を同じ要素に使わない

```vue
<!-- ✗ 悪い例 -->
<li v-for="report in reports" v-if="report.date === today">

<!-- ✓ よい例 -->
<template v-for="report in reports">
  <li v-if="report.date === today">...</li>
</template>
```

---

## 命名規則

### ファイル名

| 種別 | 形式 | 例 |
|------|------|-----|
| ページ | kebab-case | `report.vue`, `reset-password.vue` |
| コンポーネント | PascalCase | `ReportInputModal.vue`, `ReportCard.vue` |
| composable | camelCase（use プレフィックス） | `useCurrentUser.ts` |
| Server API | kebab-case | `index.get.ts`, `[id]/index.put.ts` |
| 型定義 | camelCase | `database.types.ts` |

### 変数・関数

| 種別 | 形式 | 例 |
|------|------|-----|
| 変数・関数 | camelCase | `weekStart`, `fetchReports` |
| リアクティブ変数 | camelCase | `const isOpen = ref(false)` |
| computed | camelCase（名詞または is/has プレフィックス） | `weekLabel`, `hasReport` |
| 定数（変わらない値） | UPPER_SNAKE_CASE | `DAY_LABELS`, `MAX_CONTENT_LENGTH` |
| 型・インターフェース | PascalCase | `DailyReport`, `UserRole` |

### コンポーネント名

意味が明確になるよう、**役割 + 種別** の順で命名する。

```
ReportInputModal   // 日報 + 入力 + モーダル
ReportCard         // 日報 + カード
CommentInputModal  // コメント + 入力 + モーダル
UserAddModal       // ユーザー + 追加 + モーダル
```

---

## ファイルの分割基準

- **200〜400行** が目安。800行を超えたら分割を検討する
- 1ファイルに1つの責務（コンポーネント、composable、APIハンドラー）
- 複数のコンポーネントで使うロジックは `composables/` に切り出す

---

## データ取得のルール

### `$fetch` を使う（Supabase クライアントを直接呼ばない）

```typescript
// ✗ 悪い例（フロントから直接 Supabase を呼ぶ）
const supabase = useSupabaseClient()
const { data } = await supabase.from('daily_reports').select('*')

// ✓ よい例（Server API 経由）
const reports = await $fetch('/api/reports', {
  query: { weekStart: '2026-05-19' }
})
```

### エラーハンドリングを必ず書く

```typescript
// ✗ 悪い例
const reports = await $fetch('/api/reports', { query: { weekStart } })

// ✓ よい例
try {
  const reports = await $fetch('/api/reports', { query: { weekStart } })
  // 成功処理
} catch (error) {
  // トースト等でユーザーに通知
  toast.add({ title: '日報の取得に失敗しました', color: 'red' })
}
```

### `onMounted` より `useFetch` を優先する

```vue
<!-- ✗ 悪い例 -->
<script setup lang="ts">
const reports = ref([])
onMounted(async () => {
  reports.value = await $fetch('/api/reports', { query: { weekStart } })
})
</script>

<!-- ✓ よい例 -->
<script setup lang="ts">
const { data: reports } = await useFetch('/api/reports', {
  query: { weekStart }
})
</script>
```

> `useFetch` は SSR・キャッシュ・ローディング状態を自動で管理してくれる。

---

## Git ワークフロー

### ブランチ命名規則

```
feature/タスク番号-概要
fix/タスク番号-概要
```

**例**:
```
feature/2-1-report-layout
feature/2-3-report-save-api
fix/2-4-report-date-bug
```

### コミットメッセージ

```
<type>: <日本語で何をしたか>
```

| type | 使いどころ |
|------|----------|
| `feat` | 新機能の追加 |
| `fix` | バグ修正 |
| `refactor` | 動作を変えないコードの整理 |
| `style` | フォーマット・見た目の変更 |
| `docs` | ドキュメントの変更 |
| `test` | テストの追加・修正 |
| `chore` | 設定ファイルなどの変更 |

**例**:
```
feat: 日報入力モーダルのUIを実装
fix: 退勤時間が出勤時間より前でも保存できる問題を修正
docs: API設計書にコメントエンドポイントを追加
```

### PR の作り方

1. `main` から作業ブランチを切る
2. 変更を小さく保つ（1 PR = 1機能 or 1修正）
3. PR テンプレートに従って説明を書く
4. PL にレビューを依頼する（GitHub の Reviewers に指定）
5. レビューの指摘は必ずコメントで返答してから修正する

---

## やってはいけないこと

| ✗ | 理由 |
|---|------|
| `console.log` を残したままコミット | 本番ログが汚れる。デバッグ後は必ず削除する |
| `any` を使う | 型安全が失われバグの原因になる |
| フロントから直接 Supabase を呼ぶ | スキーマが露出する。必ず `/api/` 経由にする |
| 1ファイルに複数コンポーネントを定義する | 見通しが悪くなる |
| `main` に直接 push する | レビューなしで本番に反映されてしまう |
| シークレット（パスワード・APIキー）をコードに書く | `.env` に書き、コードには書かない |
