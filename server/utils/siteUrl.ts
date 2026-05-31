import type { H3Event } from 'h3'

/**
 * メールリンク等に使うサイトの公開ベース URL（origin）を返す。
 *
 * 設定があれば NUXT_PUBLIC_SITE_URL（runtimeConfig.public.siteUrl）を、無ければ
 * リクエストの origin にフォールバックする。リダイレクト先をサーバー側で決定し、
 * クライアント入力を信用しない（オープンリダイレクト防止）。
 */
export const resolveSiteBaseUrl = (event: H3Event): string => {
  const config = useRuntimeConfig(event)
  return config.public.siteUrl || getRequestURL(event).origin
}
