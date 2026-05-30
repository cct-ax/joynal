import type { NuxtApp } from '#app'

/**
 * keyed `useAsyncData` をページ間ナビゲーションで再利用するための `getCachedData`。
 *
 * Nuxt の既定 `getCachedData` を使うと `experimental.purgeCachedData`（既定 ON）が
 * ルート遷移でキャッシュを purge するため、タブ切替（コンポーネント再マウント）のたびに
 * ハンドラが再実行され同じ API を何度も叩く。**カスタム `getCachedData` を渡すこと自体が
 * その key の purge を無効化**するので、ナビ後もキャッシュが残り再フェッチを防げる。
 *
 * 挙動:
 * - `'initial'`（再マウント／ハイドレーション）→ キャッシュを返す＝再フェッチしない。
 * - `'watch'`（key/依存の変化）・手動 `refresh()`（`'refresh:manual'`/`'refresh:hook'`）→ `undefined`＝最新化する。
 *
 * 使い方: `useAsyncData(key, handler, { getCachedData: reuseAsyncData })`
 * 注意: data が「同一 key で変わる watch 依存」を持つ場合（例: 週やユーザーで変わるが key は固定）は、
 * ナビ時に古い値を返しうるため使わない（key を依存込みにするのが先）。
 */
export const reuseAsyncData = <T>(key: string, nuxtApp: NuxtApp, ctx: { cause: string }): T | undefined =>
  ctx.cause === 'initial'
    ? nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
    : undefined
