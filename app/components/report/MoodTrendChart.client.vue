<script setup lang="ts">
/**
 * mood 推移グラフ（直近 N 週の日次 mood を滑らかな曲線で表示）。
 *
 * - クライアント専用（*.client.vue）。@unovis/vue は SVG ベースだが SSR バンドルに載せないため
 *   このコンポーネント単位でクライアントに閉じる（report ボードは元々 mounted ゲートで描画される）。
 * - y 軸は 1〜5 固定（水平グリッドのみ）。x 軸は日付（M/DD）の目盛のみ。
 * - mood 未入力日は series 側で null（曲線・エリアが分断＝ギャップになる）。
 * - ホバーでクロスヘア＋ツールチップ（日付（曜）／気分＋絵文字）。
 */
import {
  VisXYContainer, VisArea, VisLine, VisScatter, VisAxis, VisCrosshair, VisTooltip
} from '@unovis/vue'
import { CurveType } from '@unovis/ts'
import type { MoodChartPoint } from '../../utils/moodChart'
import { formatMonthDay, parseYmd, weekdayLabel } from '#shared/utils/date'

const props = defineProps<{ series: MoodChartPoint[] }>()

const x = (d: MoodChartPoint): number => d.ts
const y = (d: MoodChartPoint): number | null => d.mood

const MOOD_EMOJI: Record<number, string> = { 1: '😢', 2: '😟', 3: '😐', 4: '🙂', 5: '😄' }

const xTickFormat = (ts: number): string => formatMonthDay(new Date(ts))
const yTickFormat = (v: number): string => String(v)

const color = 'var(--ui-primary)'

// primary をフェードさせるグラデーション塗り（stop-color は style で CSS 変数を解決させる）。
const svgDefs = `
  <linearGradient id="mood-area-gradient" gradientTransform="rotate(90)">
    <stop offset="0%" style="stop-color: var(--ui-primary); stop-opacity: 0.22;" />
    <stop offset="100%" style="stop-color: var(--ui-primary); stop-opacity: 0;" />
  </linearGradient>
`

const crosshairTemplate = (d: MoodChartPoint): string => {
  const date = parseYmd(d.date)
  const label = date ? `${formatMonthDay(date)}（${weekdayLabel(date)}）` : d.date
  const body = d.mood === null
    ? '<span style="color: var(--ui-text-muted);">記録なし</span>'
    : `気分 ${d.mood} ${MOOD_EMOJI[d.mood] ?? ''}`
  return `<div style="font-size:12px; line-height:1.5;">`
    + `<div style="font-weight:600;">${label}</div>`
    + `<div>${body}</div>`
    + `</div>`
}
</script>

<template>
  <VisXYContainer
    :data="props.series"
    :height="240"
    :y-domain="[1, 5]"
    :margin="{ top: 12, right: 16, bottom: 4, left: 4 }"
    :svg-defs="svgDefs"
  >
    <VisArea
      :x="x"
      :y="y"
      :curve-type="CurveType.MonotoneX"
      color="url(#mood-area-gradient)"
    />
    <VisLine
      :x="x"
      :y="y"
      :curve-type="CurveType.MonotoneX"
      :color="color"
      :line-width="2.5"
    />
    <VisScatter
      :x="x"
      :y="y"
      :size="7"
      :color="color"
      stroke-color="var(--ui-bg)"
      :stroke-width="2"
    />
    <VisAxis
      type="x"
      :tick-format="xTickFormat"
      :grid-line="false"
      :domain-line="false"
      :tick-line="false"
      :num-ticks="6"
    />
    <VisAxis
      type="y"
      :tick-values="[1, 2, 3, 4, 5]"
      :tick-format="yTickFormat"
      :domain-line="false"
      :tick-line="false"
      :grid-line="true"
    />
    <VisCrosshair
      :template="crosshairTemplate"
      :color="color"
    />
    <VisTooltip />
  </VisXYContainer>
</template>
