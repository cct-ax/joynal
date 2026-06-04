/**
 * Nuxt UI v4 のテーマ設定。
 * docs/design-spec.md のカラートークン（primary: Indigo, danger: Red 等）に対応する。
 *
 * Nuxt UI の色名（primary/secondary/success など）は Tailwind の色パレットを参照する。
 * 詳細: https://ui.nuxt.com/getting-started/theme
 */
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'indigo',
      secondary: 'sky',
      success: 'green',
      info: 'sky',
      warning: 'amber',
      error: 'red',
      neutral: 'slate'
    }
  }
})
