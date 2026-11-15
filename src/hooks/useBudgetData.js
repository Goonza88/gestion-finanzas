import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentMonthKey, getMonthKeyFromDate, getMonthLabel, getMonthSequence } from '../utils/date'
import { getCreditMonthlyPayment, isOngoingCredit } from '../utils/credit'

const STORAGE_KEY = 'gestion_financiera_personal_v1'
const currentYear = new Date().getFullYear()

function defaultState() {
  return {
    year: currentYear,
    monthlyRecords: {},
    credits: [],
    recurringRules: [],
  }
}

function loadBudget() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const saved = JSON.parse(raw)
    return {
      ...defaultState(),
      ...saved,
      monthlyRecords: saved.monthlyRecords || {},
      credits: saved.credits || [],
      recurringRules: saved.recurringRules || [],
    }
  } catch (error) {
    console.error('Error cargando datos:', error)
    return defaultState()
  }
}

function saveBudget(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Error guardando datos:', error)
  }
}

function isValidBackupData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  if (!Number.isInteger(data.year) || data.year < 1900 || data.year > 9999 || !data.monthlyRecords || typeof data.monthlyRecords !== 'object' || Array.isArray(data.monthlyRecords)) return false
  if (!Array.isArray(data.credits) || !data.credits.every((credit) => (
    credit &&
    typeof credit === 'object' &&
    !Array.isArray(credit) &&
    (typeof credit.id === 'string' || Number.isFinite(credit.id)) &&
    typeof credit.name === 'string' &&
    typeof credit.startDate === 'string' &&
    (credit.paymentChanges === undefined || (Array.isArray(credit.paymentChanges) && credit.paymentChanges.every((change) => (
      change &&
      /^\d{4}-(0[1-9]|1[0-2])$/.test(change.effectiveMonth) &&
      Number.isFinite(Number(change.monthlyPayment)) &&
      Number(change.monthlyPayment) > 0
    )))) &&
    (credit.duration === 'ongoing'
      ? Number.isFinite(Number(credit.monthlyPayment)) && Number(credit.monthlyPayment) > 0
      : Number.isFinite(Number(credit.totalPrice)) && Number(credit.totalPrice) > 0 && Number.isInteger(Number(credit.installments)) && Number(credit.installments) > 0)
  ))) return false
  if (data.recurringRules !== undefined && (!Array.isArray(data.recurringRules) || !data.recurringRules.every((rule) => (
    rule &&
    typeof rule === 'object' &&
    (rule.type === 'income' || rule.type === 'expense') &&
    typeof rule.description === 'string' &&
    Number.isFinite(Number(rule.amount)) &&
    Number(rule.amount) > 0 &&
    Number.isInteger(Number(rule.dayOfMonth)) &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(rule.startMonth) &&
    (!rule.endMonth || /^\d{4}-(0[1-9]|1[0-2])$/.test(rule.endMonth)) &&
    (typeof rule.id === 'string' || Number.isFinite(rule.id))
  )))) return false

  return Object.entries(data.monthlyRecords).every(([monthKey, record]) => (
    /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) &&
    record &&
    typeof record === 'object' &&
    Array.isArray(record.transactions) &&
    record.transactions.every((transaction) => (
      transaction &&
      typeof transaction === 'object' &&
      (typeof transaction.id === 'string' || Number.isFinite(transaction.id)) &&
      (transaction.type === 'income' || transaction.type === 'expense') &&
      typeof transaction.description === 'string' &&
      Number.isFinite(Number(transaction.amount)) &&
      Number(transaction.amount) > 0 &&
      typeof transaction.date === 'string'
    ))
  )) && data.credits.every((credit) => credit && typeof credit === 'object' && !Array.isArray(credit))
}

function monthCreditCommitment(credit, monthKey) {
  const isActive = credit.startKey <= monthKey && (credit.duration === 'ongoing' || monthKey <= credit.endKey)
  return isActive ? getCreditMonthlyPayment(credit, monthKey) : 0
}

export default function useBudgetData() {
  const [budget, setBudget] = useState(() => loadBudget())

  useEffect(() => {
    saveBudget(budget)
  }, [budget])

  const creditDetails = useMemo(() => {
    return budget.credits.map((credit) => {
      const amount = Math.round(Number(credit.totalPrice) || 0)
      const duration = isOngoingCredit(credit) ? 'ongoing' : 'fixed'
      const installments = duration === 'ongoing' ? null : Number(credit.installments) || 1
      const baseMonthlyPayment = duration === 'ongoing'
        ? Number(credit.monthlyPayment) || 0
        : installments > 0
          ? Math.floor(amount / installments)
          : 0
      const startKey = getMonthKeyFromDate(credit.startDate)
      let endKey = null
      let remainingInstallments = null
      let totalRemaining = null
      if (duration === 'fixed') {
        const [year, month] = startKey.split('-').map(Number)
        const endIndex = month + installments - 1
        const endYear = year + Math.floor((endIndex - 1) / 12)
        const endMonth = ((endIndex - 1) % 12) + 1
        endKey = `${endYear}-${String(endMonth).padStart(2, '0')}`
        const currentKey = getCurrentMonthKey()
        const elapsed = currentKey < startKey
          ? 0
          : Math.min(installments, Math.max(0,
              (Number(currentKey.slice(0, 4)) - year) * 12 +
              (Number(currentKey.slice(5)) - month) + 1,
            ))
        remainingInstallments = Math.max(0, installments - elapsed)
        const finalPayment = Math.max(0, amount - baseMonthlyPayment * (installments - 1))
        totalRemaining = remainingInstallments > 0
          ? baseMonthlyPayment * (remainingInstallments - 1) + finalPayment
          : 0
      }
      const monthlyPayment = getCreditMonthlyPayment({
        ...credit,
        duration,
        amount,
        installments,
        baseMonthlyPayment,
        endKey,
      }, getCurrentMonthKey())
      return {
        ...credit,
        duration,
        amount,
        installments,
        baseMonthlyPayment,
        monthlyPayment,
        startKey,
        endKey,
        remainingInstallments,
        totalRemaining,
      }
    })
  }, [budget.credits])

  const monthSummaries = useMemo(() => {
    const months = getMonthSequence(budget.year)
    return months.map((monthKey) => {
      const entry = budget.monthlyRecords[monthKey] || { transactions: [] }
      const transactions = entry.transactions || []
      const income = transactions
        .filter((tx) => tx.type === 'income')
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
      const expense = transactions
        .filter((tx) => tx.type === 'expense')
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
      const creditCommitment = creditDetails.reduce(
        (sum, credit) => sum + monthCreditCommitment(credit, monthKey),
        0,
      )
      const totalExpense = expense + creditCommitment
      return {
        monthKey,
        label: getMonthLabel(monthKey),
        income,
        expense,
        creditCommitment,
        balance: income - totalExpense,
        transactionCount: transactions.length,
      }
    })
  }, [budget.monthlyRecords, budget.year, creditDetails])

  const annualTotals = useMemo(() => {
    const income = monthSummaries.reduce((sum, month) => sum + month.income, 0)
    const expense = monthSummaries.reduce((sum, month) => sum + month.expense + month.creditCommitment, 0)
    return {
      income,
      expense,
      balance: income - expense,
    }
  }, [monthSummaries])

  const activeCredits = useMemo(() => {
    const currentMonth = getCurrentMonthKey()
    return creditDetails.filter((credit) => (
      credit.duration === 'ongoing'
        ? credit.startKey <= currentMonth
        : credit.remainingInstallments > 0
    ))
  }, [creditDetails])

  const creditMonthlyCommitmentThisMonth = useMemo(() => {
    const currentKey = getCurrentMonthKey()
    return creditDetails.reduce((sum, credit) => sum + monthCreditCommitment(credit, currentKey), 0)
  }, [creditDetails])

  function addTransaction(transaction) {
    const monthKey = getMonthKeyFromDate(transaction.date)
    setBudget((prev) => {
      const existing = prev.monthlyRecords[monthKey] || { transactions: [] }
      return {
        ...prev,
        monthlyRecords: {
          ...prev.monthlyRecords,
          [monthKey]: {
            ...existing,
            transactions: [transaction, ...existing.transactions],
            appliedRecurringIds: transaction.sourceRecurringId
              ? [...new Set([...(existing.appliedRecurringIds || []), transaction.sourceRecurringId])]
              : existing.appliedRecurringIds,
          },
        },
      }
    })
  }

  function removeTransaction(monthKey, transactionId) {
    setBudget((prev) => {
      const existing = prev.monthlyRecords[monthKey]
      if (!existing) return prev
      const updated = existing.transactions.filter((tx) => tx.id !== transactionId)
      return {
        ...prev,
        monthlyRecords: {
          ...prev.monthlyRecords,
          [monthKey]: {
            ...existing,
            transactions: updated,
          },
        },
      }
    })
  }

  function updateTransaction(monthKey, transaction) {
    setBudget((prev) => {
      const existing = prev.monthlyRecords[monthKey] || { transactions: [] }
      const hasExisting = existing.transactions.some((tx) => tx.id === transaction.id)
      const transactions = hasExisting
        ? existing.transactions.map((tx) => (tx.id === transaction.id ? transaction : tx))
        : [transaction, ...existing.transactions]
      return {
        ...prev,
        monthlyRecords: {
          ...prev.monthlyRecords,
          [monthKey]: {
            ...existing,
            transactions,
          },
        },
      }
    })
  }

  function addCredit(credit) {
    const newCredit = {
      id: Date.now(),
      duration: credit.duration,
      name: credit.name,
      totalPrice: Number(credit.totalPrice),
      installments: credit.duration === 'ongoing' ? null : Number(credit.installments),
      monthlyPayment: Number(credit.monthlyPayment),
      startDate: credit.startDate,
      paymentChanges: [],
    }
    setBudget((prev) => ({
      ...prev,
      credits: [newCredit, ...prev.credits],
    }))
  }

  function updateCreditPayment(creditId, monthlyPayment) {
    const effectiveMonth = getCurrentMonthKey()
    setBudget((prev) => ({
      ...prev,
      credits: prev.credits.map((credit) => {
        if (credit.id !== creditId) return credit
        const paymentChanges = [...(credit.paymentChanges || [])]
        const existingIndex = paymentChanges.findIndex((change) => change.effectiveMonth === effectiveMonth)
        const change = { effectiveMonth, monthlyPayment }
        if (existingIndex >= 0) paymentChanges[existingIndex] = change
        else paymentChanges.push(change)
        return { ...credit, paymentChanges }
      }),
    }))
  }

  function addRecurringRule(rule) {
    const newRule = { ...rule, id: Date.now() }
    setBudget((prev) => ({ ...prev, recurringRules: [newRule, ...(prev.recurringRules || [])] }))
  }

  function updateRecurringRule(rule) {
    setBudget((prev) => ({
      ...prev,
      recurringRules: (prev.recurringRules || []).map((item) => item.id === rule.id ? rule : item),
    }))
  }

  function removeRecurringRule(ruleId) {
    setBudget((prev) => ({
      ...prev,
      recurringRules: (prev.recurringRules || []).filter((rule) => rule.id !== ruleId),
    }))
  }

  const applyRecurringTransactions = useCallback((monthKey) => {
    setBudget((prev) => {
      const existing = prev.monthlyRecords[monthKey] || { transactions: [] }
      const appliedIds = new Set(existing.appliedRecurringIds || [])
      const rulesToApply = (prev.recurringRules || []).filter((rule) => (
        rule.startMonth <= monthKey &&
        (!rule.endMonth || monthKey <= rule.endMonth) &&
        !appliedIds.has(rule.id)
      ))

      if (rulesToApply.length === 0) return prev

      const [year, month] = monthKey.split('-').map(Number)
      const transactions = [...existing.transactions]
      rulesToApply.forEach((rule) => {
        const lastDay = new Date(year, month, 0).getDate()
        const day = Math.min(Number(rule.dayOfMonth), lastDay)
        transactions.unshift({
          id: Date.now() + transactions.length,
          type: rule.type,
          description: rule.description,
          amount: Number(rule.amount),
          date: `${monthKey}-${String(day).padStart(2, '0')}`,
          sourceRecurringId: rule.id,
        })
        appliedIds.add(rule.id)
      })

      return {
        ...prev,
        monthlyRecords: {
          ...prev.monthlyRecords,
          [monthKey]: {
            ...existing,
            transactions,
            appliedRecurringIds: [...appliedIds],
          },
        },
      }
    })
  }, [])

  function removeCredit(creditId) {
    setBudget((prev) => ({
      ...prev,
      credits: prev.credits.filter((credit) => credit.id !== creditId),
    }))
  }

  function getMonthRecord(monthKey) {
    return budget.monthlyRecords[monthKey] || { transactions: [] }
  }

  function changeYear(year) {
    if (!Number.isInteger(year) || year < 1900 || year > 9999) return
    setBudget((prev) => ({ ...prev, year }))
  }

  function exportBackup() {
    return JSON.stringify({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: budget,
    }, null, 2)
  }

  function importBackup(contents) {
    const backup = JSON.parse(contents)
    if (backup?.schemaVersion !== 1 || !isValidBackupData(backup.data)) {
      throw new Error('El archivo no tiene un respaldo válido de Gestión Financiera.')
    }
    setBudget({ ...backup.data, recurringRules: backup.data.recurringRules || [] })
  }

  return {
    year: budget.year,
    changeYear,
    exportBackup,
    importBackup,
    annualTotals,
    monthSummaries,
    recurringRules: budget.recurringRules || [],
    activeCredits,
    creditMonthlyCommitmentThisMonth,
    creditDetails,
    getMonthRecord,
    addTransaction,
    removeTransaction,
    updateTransaction,
    addCredit,
    updateCreditPayment,
    addRecurringRule,
    updateRecurringRule,
    removeRecurringRule,
    applyRecurringTransactions,
    removeCredit,
  }
}
