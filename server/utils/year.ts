/** 年の入力が無ければ現在年を返す。 */
export const resolveYear = (input?: number): number => input ?? new Date().getFullYear()
