import { fileURLToPath } from 'node:url'
import { defineContentConfig, defineCollection } from '@nuxt/content'

/**
 * @nuxt/content（dev 限定の docs サイト）のコレクション定義。
 *
 * 既存の repo ルート `docs/*.md` を単一ソースとして配信する（ファイルは移動しない）。
 * - `cwd` を repo の `docs/` に向ける（`content/` ではなく `docs/`）。
 * - `test-users.md` は gitignore 対象のため除外。
 * - `prefix:'/docs'` で `docs/architecture.md` → ルート `/docs/architecture`。
 * タイトルは各ファイル先頭の H1 から自動導出（フロントマターは付けず GitHub 表示を保つ）。
 */
export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      source: {
        cwd: fileURLToPath(new URL('./docs', import.meta.url)),
        include: '**/*.md',
        // test-users.md は gitignore、PLAN.md は GitHub Issue ミラーの内部進捗（サイトには出さない）。
        exclude: ['test-users.md', 'PLAN.md'],
        prefix: '/docs'
      }
    })
  }
})
