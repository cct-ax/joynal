import { describe, expect, it } from 'vitest'

describe('useLazyOpen', () => {
  it('初期 false（source が false なら false のまま）', () => {
    const open = ref(false)
    const mounted = useLazyOpen(open)
    expect(mounted.value).toBe(false)
  })

  it('source を true にすると true になる', async () => {
    const open = ref(false)
    const mounted = useLazyOpen(open)
    open.value = true
    await nextTick()
    expect(mounted.value).toBe(true)
  })

  it('一度 true になったら source を false に戻しても true のまま（latch）', async () => {
    const open = ref(false)
    const mounted = useLazyOpen(open)
    open.value = true
    await nextTick()
    expect(mounted.value).toBe(true)
    open.value = false
    await nextTick()
    expect(mounted.value).toBe(true)
  })

  it('初期から true の source は同期的に true（immediate）', () => {
    const open = ref(true)
    const mounted = useLazyOpen(open)
    expect(mounted.value).toBe(true)
  })

  it('getter（computed）でも latch する', async () => {
    const flag = ref(false)
    const open = computed(() => flag.value)
    const mounted = useLazyOpen(open)
    expect(mounted.value).toBe(false)
    flag.value = true
    await nextTick()
    expect(mounted.value).toBe(true)
    flag.value = false
    await nextTick()
    expect(mounted.value).toBe(true)
  })
})
