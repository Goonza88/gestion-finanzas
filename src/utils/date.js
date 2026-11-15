export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export function getCurrentDateISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthKeyFromDate(date) {
  if (!date) return ''
  // Accept YYYY-MM-DD without timezone and parse as local date to avoid timezone shifts
  const isoMatch = String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const y = Number(isoMatch[1])
    const m = Number(isoMatch[2])
    // day not needed for month key
    return `${y}-${String(m).padStart(2, '0')}`
  }
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
}

export function getYearFromKey(monthKey) {
  return Number(monthKey.split('-')[0])
}

export function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return monthKey
  return `${MONTH_NAMES[month - 1]} ${year}`
}

export function getMonthSequence(year) {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
}
