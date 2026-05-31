import type { MaybeRefOrGetter, Ref } from 'vue'

/**
 * モーダル等の遅延マウント用 latch。
 * open が一度でも true になったら true を返し続ける（以後マウントを維持）。
 * v-if に使うと Lazy コンポーネントのチャンク取得を初回オープンまで遅延できる。
 */
export const useLazyOpen = (open: MaybeRefOrGetter<boolean>): Readonly<Ref<boolean>> => {
  const mounted = ref(false)
  watch(() => toValue(open), (v) => {
    if (v) mounted.value = true
  }, { immediate: true })
  return readonly(mounted)
}
