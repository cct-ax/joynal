/**
 * 週単位ナビゲーションの状態を集約する composable。
 *
 * - 「今週月曜」の計算を 1 箇所に集約（report.vue / WeekNavigator で散在しないように）
 * - 前後週移動・任意週ジャンプを提供
 * - API クエリ用の `weekStartYmd` を提供（YYYY-MM-DD 形式）
 *
 * 使い方:
 *   const { currentWeekStart, weekDays, weekStartYmd, goPrev, goNext } = useWeekNavigation()
 *
 * 設計判断: WeekNavigator コンポーネントは「親の状態に追従する props 駆動」なので
 * 内部で本 composable を呼ばない（二重管理を避けるため）。
 * 状態を持つ親（report.vue / 将来の admin.vue）が本 composable を呼ぶ。
 */
export const useWeekNavigation = (initial?: Date) => {
  const currentWeekStart = ref(getMondayOf(initial ?? new Date()))

  const weekDays = computed(() => getWeekDays(currentWeekStart.value))
  const thisMonday = computed(() => getMondayOf(new Date()))
  const isThisWeek = computed(
    () => formatYmd(currentWeekStart.value) === formatYmd(thisMonday.value)
  )
  const weekLabel = computed(() => formatWeekLabel(currentWeekStart.value))
  const weekStartYmd = computed(() => formatYmd(currentWeekStart.value))

  const goPrev = (): void => {
    currentWeekStart.value = addDays(currentWeekStart.value, -7)
  }
  const goNext = (): void => {
    currentWeekStart.value = addDays(currentWeekStart.value, 7)
  }
  const goThisWeek = (): void => {
    currentWeekStart.value = thisMonday.value
  }
  const goTo = (date: Date): void => {
    currentWeekStart.value = getMondayOf(date)
  }

  return {
    currentWeekStart,
    weekDays,
    thisMonday,
    isThisWeek,
    weekLabel,
    weekStartYmd,
    goPrev,
    goNext,
    goThisWeek,
    goTo
  }
}
