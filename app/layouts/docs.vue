<script setup lang="ts">
/**
 * docs サイト（dev 限定・@nuxt/content）専用レイアウト。
 *
 * AppHeader/AppFooter を共有しつつ、左サイドバー目次＋本文の二段組にする。
 * 目次の並びは論理順（DOC_ORDER）で制御する（docs/*.md にフロントマターを付けず
 * GitHub 表示を保つため、順序はここで明示する）。
 *
 * 本ファイルは content 依存（queryCollection）のため nuxt.config の ignore で本番ビルドから除外する。
 */

// 論理的な閲覧順（ファイル名 stem）。未掲載のものは末尾にアルファベット順で続く。
const DOC_ORDER = [
  'requirements',
  'architecture',
  'screen-flow',
  'design-spec',
  'component-diagram',
  'api-design',
  'db-design',
  'rls-design',
  'coding-guidelines',
  'glossary'
]

type DocLink = { title: string, path: string, stem: string }
// queryCollection の戻りから使うフィールドだけを明示する。content の型が未ロードな状態
// （test/build 後の .nuxt）でも data 以降が any に崩れないようにする。
type DocRow = { path?: string, title?: string }

const route = useRoute()

const { data: docs } = await useAsyncData<DocRow[]>('docs:nav', () => queryCollection('docs').all())

const links = computed<DocLink[]>(() => {
  const items = (docs.value ?? []).map((d): DocLink => {
    const path = d.path ?? ''
    const stem = path.split('/').pop() ?? path
    return { title: d.title ?? stem, path, stem }
  })
  const rank = (stem: string): number => {
    const i = DOC_ORDER.indexOf(stem)
    return i === -1 ? DOC_ORDER.length : i
  }
  return items.sort((a, b) => rank(a.stem) - rank(b.stem) || a.title.localeCompare(b.title))
})

const isActive = (path: string): boolean => route.path === path
</script>

<template>
  <div class="flex flex-col min-h-dvh">
    <AppHeader />
    <UMain
      class="bg-slate-50 dark:bg-slate-950"
      :ui="{ base: 'flex-1 min-h-0' }"
    >
      <div class="max-w-7xl mx-auto w-full px-4 py-6 flex gap-8">
        <aside class="hidden md:block w-56 shrink-0">
          <nav
            class="sticky top-20 space-y-0.5"
            aria-label="ドキュメント目次"
          >
            <p class="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              設計ドキュメント
            </p>
            <NuxtLink
              v-for="link in links"
              :key="link.path"
              :to="link.path"
              class="block rounded-md px-2 py-1.5 text-sm transition-colors"
              :class="isActive(link.path)
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-default hover:bg-elevated/50'"
            >
              {{ link.title }}
            </NuxtLink>
          </nav>
        </aside>

        <main class="min-w-0 flex-1">
          <slot />
        </main>
      </div>
    </UMain>
    <AppFooter />
  </div>
</template>
