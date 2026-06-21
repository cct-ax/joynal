<script setup lang="ts">
/**
 * docs サイトの本文ページ（dev 限定・@nuxt/content）。
 * ルート `/docs/<stem>` に対応する Markdown を取得して ContentRenderer で描画する。
 * 本ファイルは content 依存のため nuxt.config の ignore で本番ビルドから除外する。
 */
definePageMeta({ layout: 'docs' })

const route = useRoute()

const { data: page } = await useAsyncData(`docs:${route.path}`, () =>
  queryCollection('docs').path(route.path).first()
)

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'ドキュメントが見つかりません', fatal: true })
}

useSeoMeta({
  title: () => (page.value?.title ? `${page.value.title} · Joynal Docs` : 'Joynal Docs')
})
</script>

<template>
  <ContentRenderer
    v-if="page"
    :value="page"
    class="prose-docs"
  />
</template>
