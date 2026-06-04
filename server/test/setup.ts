import { vi } from 'vitest'

// defineRouteMeta は Nitro のビルド時マクロ（auto-import）で、vitest(nuxt) 環境には注入されない。
// 各 server/api ハンドラは top-level で defineRouteMeta({ openAPI }) を呼ぶため、テストが
// ハンドラを直接 import すると「ReferenceError: defineRouteMeta is not defined」で落ちる。
// no-op を global に登録して回避する（本番ビルドでは Nitro が本物のマクロを提供するので影響なし）。
vi.stubGlobal('defineRouteMeta', () => undefined)
