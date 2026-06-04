import { useEffect, useMemo, useState } from 'react'
import { getMonthKeyFromDate, getMonthLabel, getMonthSequence } from '../utils/date'

const STORAGE_KEY = 'gestion_financiera_personal_v1'
const currentYear = new Date().getFullYear()

function defaultState() {
  return {
    year: currentYear,
    monthlyRecords: {},
    credits: [],
  }
}

function loadBudget() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : defaultState()
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

function monthCreditCommitment(credit, monthKey) {
  return credit.startKey <= monthKey && monthKey <= credit.endKey ? credit.monthlyPayment : 0
}

export default function useBudgetData() {
  const [budget, setBudget] = useState(() => loadBudget())

  // One-time cleanup: remove any October month records to address reported bug
  useEffect(() => {
    setBudget((prev) => {
      const keys = Object.keys(prev.monthlyRecords || {})
      const octoberKeys = keys.filter((k) => k.split('-')[1] === '10')
      if (octoberKeys.length === 0) return prev
      const copy = { ...prev, monthlyRecords: { ...prev.monthlyRecords } }
      octoberKeys.forEach((k) => delete copy.monthlyRecords[k])
      return copy
    })
  }, [])

  // One-time cleanup: clear cached credits due to bug (set a flag to avoid repeating)
  useEffect(() => {
    const flagKey = 'credits_cache_cleared_v1'
    if (localStorage.getItem(flagKey)) return
    setBudget((prev) => {
      if (!prev.credits || prev.credits.length === 0) {
        try { localStorage.setItem(flagKey, '1') } catch (e) {}
        return prev
      }
      const copy = { ...prev, credits: [] }
      try { localStorage.setItem(flagKey, '1') } catch (e) {}
      return copy
    })
  }, [])

  useEffect(() => {
    saveBudget(budget)
  }, [budget])

  const creditDetails = useMemo(() => {
    return budget.credits.map((credit) => {
      const amount = Math.round(Number(credit.totalPrice) || 0)
      const installments = Number(credit.installments) || 1
      const monthlyPayment = Number.isInteger(Number(credit.monthlyPayment))
        ? Number(credit.monthlyPayment)
        : installments > 0
          ? Math.round(amount / installments)
          : 0
      const startKey = getMonthKeyFromDate(credit.startDate)
      const [year, month] = startKey.split('-').map(Number)
      const endIndex = month + installments - 1
      const endYear = year + Math.floor((endIndex - 1) / 12)
      const endMonth = ((endIndex - 1) % 12) + 1
      const endKey = `${endYear}-${String(endMonth).padStart(2, '0')}`
      const today = new Date()
      const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      const elapsed = currentKey < startKey
        ? 0
        : Math.min(
            installments,
            Math.max(
              0,
              (Number(currentKey.slice(0, 4)) - year) * 12 +
                (Number(currentKey.slice(5)) - month) +
                1,
            ),
          )
      const remainingInstallments = Math.max(0, installments - elapsed)
      const totalRemaining = monthlyPayment * remainingInstallments
      return {
        ...credit,
        amount,
        installments,
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

  const activeCredits = useMemo(
    () => creditDetails.filter((credit) => credit.remainingInstallments > 0),
    [creditDetails],
  )

  const creditMonthlyCommitmentThisMonth = useMemo(() => {
    const currentKey = getMonthKeyFromDate(new Date().toISOString())
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
            transactions: [transaction, ...existing.transactions],
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
            transactions,
          },
        },
      }
    })
  }

  function addCredit(credit) {
    const newCredit = {
      id: Date.now(),
      name: credit.name,
      totalPrice: Number(credit.totalPrice),
      installments: Number(credit.installments),
      monthlyPayment: Number(credit.monthlyPayment),
      startDate: credit.startDate,
    }
    setBudget((prev) => ({
      ...prev,
      credits: [newCredit, ...prev.credits],
    }))
  }

  function removeCredit(creditId) {
    setBudget((prev) => ({
      ...prev,
      credits: prev.credits.filter((credit) => credit.id !== creditId),
    }))
  }

  function getMonthRecord(monthKey) {
    return budget.monthlyRecords[monthKey] || { transactions: [] }
  }

  return {
    year: budget.year,
    annualTotals,
    monthSummaries,
    activeCredits,
    creditMonthlyCommitmentThisMonth,
    creditDetails,
    getMonthRecord,
    addTransaction,
    removeTransaction,
    updateTransaction,
    addCredit,
    removeCredit,
  }
}
