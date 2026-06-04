export function formatCurrency(value) {
  const num = Number(value) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    // Parse YYYY-MM-DD as local date to avoid timezone shifts
    const isoMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/)
    let d
    if (isoMatch) {
      const y = Number(isoMatch[1])
      const m = Number(isoMatch[2]) - 1
      const day = Number(isoMatch[3])
      d = new Date(y, m, day)
    } else {
      d = new Date(dateStr)
    }
    return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch (e) {
    return dateStr
  }
}
