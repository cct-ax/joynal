<script setup lang="ts">
/**
 * docs サイトのランディング（/docs）。設計ドキュメント一覧を表示する（dev 限定）。
 * 本ファイルは content 依存のため nuxt.config の ignore で本番ビルドから除外する。
 */
definePageMeta({ layout: 'docs' })

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
  'PLAN'
]

type DocCard = { title: string, path: string, description: string, stem: string }
// queryCollection の戻りから使うフィールドだけを明示（content 型が未ロードでも data 以降を保つ）。
type DocRow = { path?: string, title?: string, description?: string }

const { data: docs } = await useAsyncData<DocRow[]>('docs:index', () => queryCollection('docs').all())

const cards = computed<DocCard[]>(() => {
  const items = (docs.value ?? []).map((d): DocCard => {
    const path = d.path ?? ''
    const stem = path.split('/').pop() ?? path
    return { title: d.title ?? stem, path, description: d.description ?? '', stem }
  })
  const rank = (stem: string): number => {
    const i = DOC_ORDER.indexOf(stem)
    return i === -1 ? DOC_ORDER.length : i
  }
  return items.sort((a, b) => rank(a.stem) - rank(b.stem) || a.title.localeCompare(b.title))
})

useSeoMeta({ title: 'Joynal 設計ドキュメント' })
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-highlighted mb-1">
      Joynal 設計ドキュメント
    </h1>
    <p class="text-sm text-muted mb-6">
      アーキテクチャ・API・DB・RLS・画面フローなどの設計資料（開発環境限定）。
    </p>

    <ul class="grid gap-3 sm:grid-cols-2">
      <li
        v-for="card in cards"
        :key="card.path"
      >
        <UCard
          :ui="{ body: 'p-4 sm:p-4' }"
          class="h-full transition-shadow hover:shadow-md"
        >
          <NuxtLink
            :to="card.path"
            class="font-medium text-default hover:text-primary"
          >
            {{ card.title }}
          </NuxtLink>
          <p
            v-if="card.description"
            class="mt-1 text-sm text-muted line-clamp-2"
          >
            {{ card.description }}
          </p>
        </UCard>
      </li>
    </ul>
  </div>
</template>
