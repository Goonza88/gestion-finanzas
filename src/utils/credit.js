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
  if (credit.duration === 'fixed' && monthKey === credit.endKey) {
    const total = Number(credit.amount ?? credit.totalPrice) || 0
    const installments = Number(credit.installments) || 1
    return Math.max(0, total - basePayment * (installments - 1))
  }
  return basePayment
}
