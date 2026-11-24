export function isOngoingCredit(credit) {
  return credit.duration === 'ongoing'
}

export function isCreditActiveInMonth(credit, monthKey) {
  return credit.startKey <= monthKey && (isOngoingCredit(credit) || monthKey <= credit.endKey)
}

export function getCreditMonthlyPayment(credit, monthKey) {
  const changes = [...(credit.paymentChanges || [])]
    .filter((change) => change.effectiveMonth <= monthKey)
    .sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth))
  const latestChange = changes.at(-1)
  if (latestChange) return Number(latestChange.monthlyPayment) || 0

  const basePayment = Number(credit.baseMonthlyPayment ?? credit.monthlyPayment) || 0
  if (credit.duration === 'fixed') {
    const total = Number(credit.amount ?? credit.totalPrice) || 0
    const installments = Number(credit.installments) || 1
    const [startYear, startMonth] = (credit.startKey || '').split('-').map(Number)
    const [year, month] = monthKey.split('-').map(Number)
    const installmentIndex = (year - startYear) * 12 + month - startMonth
    if (installmentIndex >= 0 && installmentIndex < installments) {
      return Math.floor(total * (installmentIndex + 1) / installments) -
        Math.floor(total * installmentIndex / installments)
    }
  }
  return basePayment
}
