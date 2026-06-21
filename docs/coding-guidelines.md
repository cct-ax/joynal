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

### 型定義の置き場所

型定義は **すべて `shared/types/`** に集約し、`#shared/types/*` でインポートする（app・server 両方から参照できる唯一の場所）。

```
shared/types/
├── models.ts           # DB テーブル型のエイリアス
├── api.ts              # API リクエスト・レスポンスの型・共有定数
├── schemas.ts          # Zod スキーマ（フォーム＋サーバー境界の query/body）
├── database.types.ts   # Supabase 自動生成（編集禁止）
└── components.ts        # コンポーネントの defineExpose 型
```

| ファイル | 役割 |
|---------|------|
| `models.ts` | DB テーブル型のエイリアス |
| `api.ts` | API リクエスト・レスポンス型・共有定数 |
| `schemas.ts` | Zod スキーマ（フォーム＋サーバー API の query/body 検証） |
| `database.types.ts` | Supabase 自動生成（編集禁止）。`nuxt.config` の `supabase.types` も `#shared/types/database.types.ts` を指す |
| `components.ts` | コンポーネントの defineExpose 型 |

### `database.types.ts` は編集しない

自動生成ファイルのため直接書き換えない。Supabase CLI の `gen types`（出力先 `shared/types/database.types.ts`）で再生成する。
DB の型を使いたい場合は `models.ts` でエイリアスを定義してそこからインポートする。

```typescript
// shared/types/models.ts（同じフォルダなので相対 import）
import type { Tables, TablesInsert, TablesUpdate } from './database.types'

export type DailyReport = Tables<'daily_reports'>
export type DailyReportInsert = TablesInsert<'daily_reports'>
export type DailyReportUpdate = TablesUpdate<'daily_reports'>

export type Comment = Tables<'comments'>
export type Profile = Tables<'profiles'>
```

```typescript
// コンポーネント・server ハンドラー側（#shared エイリアスを使う）
import type { DailyReport } from '#shared/types/models'
```

### API の型は `api.ts` に書く

Server API のリクエスト・レスポンスに使う型はここに集める。

```typescript
// shared/types/api.ts
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

// GET /api/reports/mood-trend（mood 推移グラフ用）
export type MoodTrendQuery = {
  from: string
  to: string
  userId?: string
}
export type MoodTrendPoint = {
  date: string
  mood: MoodValue // mood 未入力日はレスポンスに含めない
}

// POST /api/ai/coach（新人コーチング）
export type AiCoachBody = {
  content?: string // 入力中のドラフト本文（任意・空ならスターター質問）
  mood?: MoodValue
}
export type AiCoachResponse = {
  questions: string[] // 振り返りの深掘り質問（2〜3個）
  feedback: string // 短い励まし（1〜2文・空文字可）
}

// GET/POST /api/ai/weekly-summary（週次サマリー）
export type AiAudience = 'self' | 'mentor' // self=本人の振り返り / mentor=観察。サーバーが導出
export type WeeklySummaryData = {
  content: string
  audience: AiAudience
  sourceUpdatedAt: string // 生成時のその週の日報 max(updated_at)
}
export type WeeklySummaryGetResponse = {
  summary: WeeklySummaryData | null
  latestReportUpdatedAt: string | null // 鮮度判定用
}
```

### Zod スキーマは `schemas.ts` に書く

フォームのバリデーションルールは `schemas.ts` に集約する。型は `z.infer` / `z.output` で導出し、手動で定義しない。

```typescript
// shared/types/schemas.ts
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
import { reportSchema, type ReportSchema } from '#shared/types/schemas'
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
| コンポーネント | PascalCase | `ReportInputModal.vue`, `ReportRow.vue` |
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
ReportRow          // 日報 + 行
CommentInputModal  // コメント + 入力 + モーダル
UserFormModal      // ユーザー + フォーム + モーダル（追加・編集兼用）
```

---

## ファイルの分割基準

- **200〜400行** が目安。800行を超えたら分割を検討する
- 1ファイルに1つの責務（コンポーネント、composable、APIハンドラー）
- 複数のコンポーネントで使うロジックは `composables/` に切り出す
- 共通化は**先回りせず、重複が出てから集約する**（rule of three）。例: 入力モーダルの lifecycle → `useModalForm`、ページの pending → `usePageLoading`

---

## データ取得のルール

### `$fetch` を使う（Supabase クライアントを直接呼ばない）

フロントエンドから Supabase の DB テーブルを直接参照することは**一切禁止**です。例外はありません。認証ユーザーのプロフィールやロールが必要な場合も、専用の composable・API 経由で取得してください。

```typescript
// ✗ 悪い例（フロントから直接 Supabase を呼ぶ）
const supabase = useSupabaseClient()
const { data } = await supabase.from('daily_reports').select('*')
const { data: profile } = await supabase.from('profiles').select('role')  // ← ロール取得も禁止

// ✓ よい例（Server API 経由）
const reports = await $fetch('/api/reports', {
  query: { weekStart: '2026-05-19' }
})

// ✓ ログインユーザーのロール・プロフィールは useCurrentUser composable を使う
const { role, isTrainee, isMentor, isOjt, isAdmin, profile, pending } = useCurrentUser()
```

> `useCurrentUser` は内部で `$fetch('/api/users/me')` を呼び出しており、DB を直接参照しません。

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
  toast.add({ title: '日報の取得に失敗しました', color: 'error' })
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

### ストリーミング（SSE）取得は `responseType: 'stream'` ＋ `readSseStream`

AI 週次サマリー生成（`POST /api/ai/weekly-summary`）のように、生成トークンを逐次表示したいミューテーションは **SSE（`text/event-stream`）** で受ける。クライアントは `$fetch` の `responseType: 'stream'` でストリームを取得し、`app/utils/sse.ts` の `readSseStream` で `{ event, data }` フレームを逐次処理する（`useWeeklySummary.generate()` 参照）。

```typescript
// ✓ SSE を逐次読む（生成トークンを少しずつ表示）
try {
  const stream = await $fetch<ReadableStream<Uint8Array>>('/api/ai/weekly-summary', {
    method: 'POST',
    body: { userId, weekStart },
    responseType: 'stream'
  })
  for await (const frame of readSseStream(stream)) {
    if (frame.event === 'delta') streamingContent.value += parseDeltaText(frame.data)
    else if (frame.event === 'done') { /* 完了メタを反映 */ }
    else if (frame.event === 'error') { /* useApiError で通知 */ }
  }
} catch (error) {
  apiError.notify(error, { fallback: 'サマリーの生成に失敗しました' })
}
```

> **設計の要点**: 認証・バリデーション・日報なし(422)・レート上限(429) の**事前チェックはストリーム開始前**に通常の HTTP ステータスで返す（`useApiError` がそのまま機能）。HTTP 200（SSE 開始）後に起きうる AI 上流失敗のみ `error` イベントで通知する。サーバーは h3 `createEventStream` で `delta` / `done` / `error` を push し、各 `data` は 1 行 JSON 文字列。上流 AI への送信は SDK を使わず素の `$fetch`（`stream: true`）で行い、`server/utils/aiChat.ts` の `streamAiProvider` が provider 別 SSE をパースする（Cloudflare Workers 互換）。

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

---

## モーダル設計パターン

モーダル（`UModal` / `ConfirmDialog` 等）の open/close 制御は、用途に応じて 3 つのパターンを使い分けます。**まずは用途ごとに素直に書く**のが「お手本」です（汎用 composable で先回り抽象化しない）。同じ入力モーダルの lifecycle（open 時の state リセット＋submit の loading/エラー処理）が複数揃ってきたら、共通化リファクタで `useModalForm` に集約する（先に実装 → 重複が出てから集約＝rule of three。PLAN.md「共通化リファクタ」R-1 参照）。下記の開閉制御パターン 1〜3 自体は集約後も初期実装の手本として有効。

### パターン 1: 単一ロケーション制御

1 ファイル内で開閉が完結する場合は、素の `ref(false)` で書く。

```vue
<script setup lang="ts">
const pwModalOpen = ref(false)
</script>

<template>
  <UButton @click="pwModalOpen = true">パスワード変更</UButton>
  <PasswordChangeModal v-model:open="pwModalOpen" />
</template>
```

**使用例**: `AppHeader.vue` の `pwModalOpen`、`ReportInputModal.vue` の `confirmDeleteOpen`、`WeekNavigator.vue` の `pickerOpen`

### パターン 2: 対象データを持って開く

「どの行を編集するか」の情報と一緒にモーダルを開く場合、`selectedXxx: Ref<T | null>` を主とし、open は computed で派生させる。

```vue
<script setup lang="ts">
const selectedReport = ref<DailyReport | null>(null)
const selectedDate = ref<string | null>(null)

// 開閉は selectedDate の有無で派生
const isModalOpen = computed({
  get: () => selectedDate.value !== null,
  set: (v: boolean) => {
    if (!v) {
      // 閉じる時に同時に対象データもクリア
      selectedReport.value = null
      selectedDate.value = null
    }
  }
})

const openEdit = (report: DailyReport): void => {
  selectedReport.value = report
  selectedDate.value = report.date
}
</script>

<template>
  <ReportInputModal
    v-model:open="isModalOpen"
    :date="selectedDate"
    :report="selectedReport"
  />
</template>
```

**使用例**: `report.vue` の `selectedReport` / `selectedDate` / `isModalOpen`

### パターン 3: 削除確認は `ConfirmDialog` を再利用

破壊的操作の確認は独自実装せず、`ConfirmDialog` を使う。

```vue
<script setup lang="ts">
const confirmDeleteOpen = ref(false)
const deleteLoading = ref(false)

const onDelete = async (): Promise<void> => {
  deleteLoading.value = true
  try {
    await $fetch(`/api/reports/${id}`, { method: 'DELETE' })
    confirmDeleteOpen.value = false
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <UButton @click="confirmDeleteOpen = true">削除</UButton>
  <ConfirmDialog
    v-model:open="confirmDeleteOpen"
    title="日報を削除"
    message="この日報を削除します。よろしいですか？"
    :loading="deleteLoading"
    @confirm="onDelete"
  />
</template>
```

### やらないこと

- **先回りで** `useModalState` のような汎用 composable に `ref(false)`（開閉制御）を抽象化する → 読みやすさが下がる、開閉制御は 3 パターンで構造が異なる。※ 重複した入力フォーム lifecycle が揃ってからの `useModalForm`（submit 共通化）への集約は別（推奨）
- モーダル内に「確認モード」を組み込む（design プロトの React 版にあるパターン）→ `ConfirmDialog` を独立コンポーネントとして使う方がテスト容易

---

## エラー処理パターン

データ取得も認証も `$fetch('/api/...')` 経由なので、エラー通知は `useApiError` に統一する。コンポーネントから `supabase.auth.*` を直接呼ばない（認証も `server/api/auth/*` 経由）。

### `useApiError`（$fetch 全般）

```vue
<script setup lang="ts">
const apiError = useApiError()

const submit = async (): Promise<void> => {
  try {
    await $fetch('/api/reports', { method: 'POST', body })
  } catch (error: unknown) {
    apiError.notify(error, {
      statusMessages: { 409: '同じ日付の日報がすでに存在します' },
      fallback: '保存に失敗しました'
    })
  }
}
</script>
```

- `statusMessages`: 特定 statusCode → 固定メッセージ
- 400 の場合は自動的にサーバーの `data.message` を優先表示
- 上記にマッチしなければ `fallback`

### 認証も同じ（`server/api/auth/*` + `useApiError`）

ログイン等も `$fetch('/api/auth/login')` を `useApiError` でラップする（`login.vue` 実装どおり）。成功後はセッション Cookie を反映させるため `navigateTo('/report', { external: true })` でフルリロードする。

```vue
<script setup lang="ts">
const apiError = useApiError()

const onSubmit = async (event: FormSubmitEvent<LoginSchema>): Promise<void> => {
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: event.data })
    await navigateTo('/report', { external: true })
  } catch (error: unknown) {
    apiError.notify(error, {
      statusMessages: { 401: 'メールアドレスまたはパスワードが正しくありません' },
      fallback: 'ログインに失敗しました'
    })
  }
}
</script>
```

### やらないこと

- `(error as { statusCode: number }).statusCode` のように `as` で型キャスト → `useApiError` または `~/utils/fetchError` の type guard を使う
- コンポーネントから `useSupabaseClient()` / `supabase.auth.*` を直接呼ぶ → 認証も含め `server/api/` 経由にする
