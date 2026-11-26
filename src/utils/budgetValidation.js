import { getMonthKeyFromDate } from './date.js'

function isValidId(id) {
  return (typeof id === 'string' && id.trim().length > 0) || (Number.isSafeInteger(id) && id > 0)
}

function hasUniqueIds(items) {
  const ids = new Set()
  return items.every((item) => {
    if (!item || !isValidId(item.id)) return false
    const key = `${typeof item.id}:${item.id}`
    if (ids.has(key)) return false
    ids.add(key)
    return true
  })
}

export function isValidBudgetData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  if (!Number.isInteger(data.year) || data.year < 1900 || data.year > 9999 || !data.monthlyRecords || typeof data.monthlyRecords !== 'object' || Array.isArray(data.monthlyRecords)) return false
  if (!Array.isArray(data.credits) || !hasUniqueIds(data.credits) || !data.credits.every((credit) => (
    credit &&
    typeof credit === 'object' &&
    !Array.isArray(credit) &&
    typeof credit.name === 'string' &&
    typeof credit.startDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(credit.startDate) &&
    Boolean(getMonthKeyFromDate(credit.startDate)) &&
    (credit.paymentChanges === undefined || (Array.isArray(credit.paymentChanges) && credit.paymentChanges.every((change) => (
      change &&
      /^\d{4}-(0[1-9]|1[0-2])$/.test(change.effectiveMonth) &&
      Number.isSafeInteger(Number(change.monthlyPayment)) &&
      Number(change.monthlyPayment) > 0
    )))) &&
    (credit.duration === 'ongoing'
      ? Number.isSafeInteger(Number(credit.monthlyPayment)) && Number(credit.monthlyPayment) > 0
      : Number.isSafeInteger(Number(credit.totalPrice)) && Number(credit.totalPrice) > 0 && Number.isSafeInteger(Number(credit.installments)) && Number(credit.installments) > 0)
  ))) return false
  if (data.recurringRules !== undefined && (!Array.isArray(data.recurringRules) || !hasUniqueIds(data.recurringRules) || !data.recurringRules.every((rule) => (
    rule &&
    typeof rule === 'object' &&
    (rule.type === 'income' || rule.type === 'expense') &&
    typeof rule.description === 'string' &&
    Number.isSafeInteger(Number(rule.amount)) &&
    Number(rule.amount) > 0 &&
    Number.isInteger(Number(rule.dayOfMonth)) &&
    Number(rule.dayOfMonth) >= 1 && Number(rule.dayOfMonth) <= 31 &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(rule.startMonth) &&
    (!rule.endMonth || /^\d{4}-(0[1-9]|1[0-2])$/.test(rule.endMonth)) &&
    (rule.active === undefined || typeof rule.active === 'boolean') &&
    (rule.active === false || !rule.endMonth || rule.endMonth >= rule.startMonth)
  )))) return false

  const recordsAreValid = Object.entries(data.monthlyRecords).every(([monthKey, record]) => (
    /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) &&
    record &&
    typeof record === 'object' &&
    Array.isArray(record.transactions) &&
    (record.appliedRecurringIds === undefined || (
      Array.isArray(record.appliedRecurringIds) &&
      record.appliedRecurringIds.every(isValidId) &&
      new Set(record.appliedRecurringIds.map((id) => `${typeof id}:${id}`)).size === record.appliedRecurringIds.length
    )) &&
    (record.skippedCreditInstallments === undefined || (
      Array.isArray(record.skippedCreditInstallments) &&
      record.skippedCreditInstallments.every(isValidId) &&
      new Set(record.skippedCreditInstallments.map((id) => `${typeof id}:${id}`)).size === record.skippedCreditInstallments.length
    )) &&
    record.transactions.every((transaction) => (
      transaction &&
      typeof transaction === 'object' &&
      isValidId(transaction.id) &&
      (transaction.type === 'income' || transaction.type === 'expense') &&
      typeof transaction.description === 'string' &&
      Number.isSafeInteger(Number(transaction.amount)) &&
      Number(transaction.amount) > 0 &&
      typeof transaction.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(transaction.date) &&
      getMonthKeyFromDate(transaction.date) === monthKey
    ))
  ))
  if (!recordsAreValid) return false
  const transactionIds = new Set()
  for (const record of Object.values(data.monthlyRecords)) {
    for (const transaction of record.transactions) {
      const key = `${typeof transaction.id}:${transaction.id}`
      if (transactionIds.has(key)) return false
      transactionIds.add(key)
    }
  }
  return true
}
