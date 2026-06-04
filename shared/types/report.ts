import type { DailyReport } from '#shared/types/models'

export type ReportWeekday = '月' | '火' | '水' | '木' | '金'

export type WeekDayItem = {
  date: Date
  dateKey: string
  weekday: ReportWeekday
  report: DailyReport | undefined
  isToday: boolean
}
