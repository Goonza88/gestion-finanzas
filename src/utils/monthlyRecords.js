import { getCreditMonthlyPayment, isCreditActiveInMonth } from './credit.js'
import { getMonthKeyFromDate } from './date.js'

function monthIndex(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return year * 12 + month - 1
}

function monthKeyFromIndex(index) {
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

function nextTransactionId(monthlyRecords, additionalTransactions) {
  const usedIds = new Set([
    ...Object.values(monthlyRecords).flatMap((record) => (
      Array.isArray(record?.transactions) ? record.transactions.map((transaction) => transaction.id) : []
    )),
    ...additionalTransactions.map((transaction) => transaction.id),
  ])
  let id = Date.now()
  while (usedIds.has(id)) id += 1
  return id
}

function getNormalizedCredit(credit) {
  const startKey = getMonthKeyFromDate(credit.startDate)
  if (!startKey) return null
  const duration = credit.duration === 'ongoing' ? 'ongoing' : 'fixed'
  const amount = Number(credit.totalPrice) || 0
  const installments = Number(credit.installments) || 1
  const baseMonthlyPayment = duration === 'ongoing'
    ? Number(credit.monthlyPayment) || 0
    : Math.floor(amount / installments)
  const lastIndex = monthIndex(startKey) + installments - 1
  return {
    ...credit,
    duration,
    amount,
    installments,
    baseMonthlyPayment,
    startKey,
    endKey: duration === 'fixed' ? monthKeyFromIndex(lastIndex) : null,
  }
}

function addTransaction(monthlyRecords, monthKey, transaction) {
  const existing = monthlyRecords[monthKey] || { transactions: [] }
  const transactions = Array.isArray(existing.transactions) ? existing.transactions : []
  const savedTransaction = { ...transaction, id: nextTransactionId(monthlyRecords, transactions) }
  monthlyRecords[monthKey] = { ...existing, transactions: [...transactions, savedTransaction] }
  return savedTransaction
}

function addCreditInstallmentIfMissing(monthlyRecords, credit, paymentMonth, installmentNumber) {
  const alreadyRecorded = Object.values(monthlyRecords).some((monthRecord) => (
    Array.isArray(monthRecord?.transactions) && monthRecord.transactions.some((transaction) => (
      transaction.sourceCreditId === credit.id &&
      transaction.sourceCreditMonth === paymentMonth &&
      transaction.isCreditInstallment === true
    ))
  ))
  if (alreadyRecorded) return false

  const amount = getCreditMonthlyPayment(credit, paymentMonth)
  if (!Number.isSafeInteger(amount) || amount <= 0) return false
  const description = credit.duration === 'fixed'
    ? `${credit.name} · cuota ${installmentNumber}/${credit.installments}`
    : `Pago mensual · ${credit.name}`
  addTransaction(monthlyRecords, paymentMonth, {
    type: 'expense',
    description,
    amount,
    date: paymentMonth === credit.startKey ? credit.startDate : `${paymentMonth}-01`,
    sourceCreditId: credit.id,
    sourceCreditMonth: paymentMonth,
    isCreditInstallment: true,
    installmentNumber: credit.duration === 'fixed' ? installmentNumber : undefined,
  })
  return true
}

export function addCreditInstallments(data, credit) {
  const normalizedCredit = getNormalizedCredit(credit)
  if (!normalizedCredit || normalizedCredit.duration !== 'fixed') return data

  const monthlyRecords = { ...(data.monthlyRecords || {}) }
  const fromIndex = monthIndex(normalizedCredit.startKey)
  const finalIndex = monthIndex(normalizedCredit.endKey)
  let changed = false
  for (let index = fromIndex; index <= finalIndex; index += 1) {
    const paymentMonth = monthKeyFromIndex(index)
    if (!isCreditActiveInMonth(normalizedCredit, paymentMonth)) continue
    changed = addCreditInstallmentIfMissing(
      monthlyRecords,
      normalizedCredit,
      paymentMonth,
      index - fromIndex + 1,
    ) || changed
  }

  return changed ? { ...data, monthlyRecords } : data
}

export function applyMonthlyTransactions(data, monthKey) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) return data

  const monthlyRecords = { ...data.monthlyRecords }
  const record = monthlyRecords[monthKey] || { transactions: [] }
  const originalTransactions = Array.isArray(record.transactions) ? record.transactions : []
  const recurringTransactions = [...originalTransactions]
  const appliedIds = new Set(Array.isArray(record.appliedRecurringIds) ? record.appliedRecurringIds : [])
  let changed = false

  for (const rule of data.recurringRules || []) {
    const ruleIsActive = rule.active !== false
    const ruleApplies = ruleIsActive && rule.startMonth <= monthKey && (!rule.endMonth || monthKey <= rule.endMonth)
    if (!ruleApplies) continue

    const alreadyExists = recurringTransactions.some((transaction) => transaction.sourceRecurringId === rule.id)
    if (alreadyExists) {
      if (!appliedIds.has(rule.id)) {
        appliedIds.add(rule.id)
        changed = true
      }
      continue
    }
    if (appliedIds.has(rule.id)) continue

    const requestedDay = Number.isInteger(Number(rule.dayOfMonth)) && Number(rule.dayOfMonth) >= 1 && Number(rule.dayOfMonth) <= 31
      ? Number(rule.dayOfMonth)
      : 1
    const [year, month] = monthKey.split('-').map(Number)
    const day = Math.min(requestedDay, new Date(year, month, 0).getDate())
    const transaction = {
      id: null,
      type: rule.type,
      description: rule.description,
      amount: Number(rule.amount),
      date: `${monthKey}-${String(day).padStart(2, '0')}`,
      sourceRecurringId: rule.id,
    }
    const savedTransaction = { ...transaction, id: nextTransactionId(monthlyRecords, recurringTransactions) }
    recurringTransactions.unshift(savedTransaction)
    appliedIds.add(rule.id)
    changed = true
  }

  if (changed || !monthlyRecords[monthKey]) {
    monthlyRecords[monthKey] = {
      ...record,
      transactions: recurringTransactions,
      appliedRecurringIds: [...appliedIds],
    }
  }

  const credits = (data.credits || []).map(getNormalizedCredit).filter(Boolean)
  for (const credit of credits) {
    const fromIndex = monthIndex(credit.startKey)
    const toIndex = monthIndex(monthKey)
    if (fromIndex > toIndex) continue
    const finalIndex = credit.duration === 'fixed'
      ? Math.min(toIndex, monthIndex(credit.endKey))
      : toIndex

    for (let index = fromIndex; index <= finalIndex; index += 1) {
      const paymentMonth = monthKeyFromIndex(index)
      if (!isCreditActiveInMonth(credit, paymentMonth)) continue
      const installmentNumber = index - fromIndex + 1
      changed = addCreditInstallmentIfMissing(monthlyRecords, credit, paymentMonth, installmentNumber) || changed
    }
  }

  const updatedRecord = monthlyRecords[monthKey] || record
  const updatedAppliedIds = [...appliedIds]
  if (
    changed ||
    !monthlyRecords[monthKey] ||
    updatedAppliedIds.length !== (record.appliedRecurringIds || []).length
  ) {
    monthlyRecords[monthKey] = {
      ...updatedRecord,
      appliedRecurringIds: updatedAppliedIds,
    }
    return { ...data, monthlyRecords }
  }
  return data
}

export function closeRecurringRule(data, ruleId, currentMonthKey, includeCurrentMonth) {
  const rule = (data.recurringRules || []).find((item) => item.id === ruleId)
  if (!rule) return data

  const monthBeforeCurrent = monthKeyFromIndex(monthIndex(currentMonthKey) - 1)
  const requestedEndMonth = includeCurrentMonth ? currentMonthKey : monthBeforeCurrent
  const endMonth = rule.endMonth && rule.endMonth < requestedEndMonth ? rule.endMonth : requestedEndMonth
  let beforeClose = data
  if (includeCurrentMonth) {
    const currentRecord = data.monthlyRecords[currentMonthKey]
    const currentTransactions = Array.isArray(currentRecord?.transactions) ? currentRecord.transactions : []
    const currentAppliedIds = Array.isArray(currentRecord?.appliedRecurringIds) ? currentRecord.appliedRecurringIds : []
    if (currentRecord && currentAppliedIds.includes(ruleId) && !currentTransactions.some((transaction) => transaction.sourceRecurringId === ruleId)) {
      beforeClose = {
        ...data,
        monthlyRecords: {
          ...data.monthlyRecords,
          [currentMonthKey]: {
            ...currentRecord,
            appliedRecurringIds: currentAppliedIds.filter((id) => id !== ruleId),
          },
        },
      }
    }
  }
  let next = includeCurrentMonth ? applyMonthlyTransactions(beforeClose, currentMonthKey) : beforeClose
  const monthlyRecords = { ...next.monthlyRecords }
  const currentRecord = monthlyRecords[currentMonthKey]
  if (currentRecord) {
    const currentTransactions = Array.isArray(currentRecord.transactions) ? currentRecord.transactions : []
    const transactions = includeCurrentMonth
      ? currentTransactions
      : currentTransactions.filter((transaction) => transaction.sourceRecurringId !== ruleId)
    const appliedRecurringIds = new Set(Array.isArray(currentRecord.appliedRecurringIds) ? currentRecord.appliedRecurringIds : [])
    if (includeCurrentMonth && rule.startMonth <= currentMonthKey && (!rule.endMonth || currentMonthKey <= rule.endMonth)) {
      appliedRecurringIds.add(ruleId)
    } else if (!includeCurrentMonth) {
      appliedRecurringIds.delete(ruleId)
    }
    monthlyRecords[currentMonthKey] = { ...currentRecord, transactions, appliedRecurringIds: [...appliedRecurringIds] }
    next = { ...next, monthlyRecords }
  }

  return {
    ...next,
    recurringRules: next.recurringRules.map((item) => item.id === ruleId
      ? { ...item, active: false, endMonth, closedAtMonth: currentMonthKey, countedCurrentMonth: includeCurrentMonth }
      : item),
  }
}

export function addCreditExtraExpense(data, creditId, monthKey, amount) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) || !Number.isSafeInteger(amount) || amount <= 0) return data
  const credit = (data.credits || []).find((item) => item.id === creditId)
  if (!credit) return data

  const existing = data.monthlyRecords[monthKey] || { transactions: [] }
  const transactions = Array.isArray(existing.transactions) ? existing.transactions : []
  const monthlyRecords = {
    ...data.monthlyRecords,
    [monthKey]: {
      ...existing,
      transactions: [...transactions, {
        id: nextTransactionId(data.monthlyRecords, transactions),
        type: 'expense',
        description: `Pago adicional · ${credit.name}`,
        amount,
        date: `${monthKey}-01`,
        sourceCreditId: creditId,
        sourceCreditMonth: monthKey,
        isCreditExtraPayment: true,
      }],
    },
  }
  return { ...data, monthlyRecords }
}

export function summarizeRecurringHistory(rule, monthlyRecords) {
  const months = new Set()
  let total = 0
  for (const [monthKey, record] of Object.entries(monthlyRecords || {})) {
    for (const transaction of Array.isArray(record.transactions) ? record.transactions : []) {
      if (transaction.sourceRecurringId !== rule.id) continue
      months.add(monthKey)
      total += Number(transaction.amount) || 0
    }
  }
  return { months: months.size, total }
}
