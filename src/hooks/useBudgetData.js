import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { getCurrentMonthKey, getMonthKeyFromDate, getMonthLabel, getMonthSequence } from '../utils/date'
import { getCreditMonthlyPayment, isOngoingCredit } from '../utils/credit'
import {
  addCreditExtraExpense as addCreditExtraExpenseToBudget,
  applyMonthlyTransactions as applyScheduledTransactions,
  closeRecurringRule as closeRecurringRuleState,
} from '../utils/monthlyRecords'
import useCurrentMonthKey from './useCurrentMonthKey'

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
    return true
  } catch (error) {
    console.error('Error guardando datos:', error)
    return false
  }
}

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

function createTransactionId(monthlyRecords, additionalTransactions = []) {
  const usedIds = new Set([...Object.values(monthlyRecords).flatMap((record) => (
    Array.isArray(record?.transactions) ? record.transactions.map((transaction) => transaction.id) : []
  )), ...additionalTransactions.map((transaction) => transaction.id)])
  let id = Date.now()
  while (usedIds.has(id)) id += 1
  return id
}

function createBackupTimestamp() {
  const date = new Date()
  const pad = (value, length = 2) => String(value).padStart(length, '0')
  return `gestion-financiera-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${pad(date.getMilliseconds(), 3)}`
}

function isValidBackupData(data) {
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

function monthCreditCommitment(credit, monthKey) {
  const isActive = credit.startKey <= monthKey && (credit.duration === 'ongoing' || monthKey <= credit.endKey)
  return isActive ? getCreditMonthlyPayment(credit, monthKey) : 0
}

export default function useBudgetData() {
  const [budget, setBudget] = useState(() => loadBudget())
  const currentMonthKey = useCurrentMonthKey()
  const saveFailureAlerted = useRef(false)
  const startupBackupStarted = useRef(false)

  useEffect(() => {
    if (!isTauri() || startupBackupStarted.current) return
    startupBackupStarted.current = true
    const currentData = localStorage.getItem(STORAGE_KEY)
    if (!currentData) return
    invoke('create_local_backup', { contents: currentData, timestamp: createBackupTimestamp() }).catch((error) => {
      console.error('No se pudo crear la copia local de inicio:', error)
      window.alert('No se pudo crear la copia local de seguridad al iniciar. Los datos actuales siguen en la aplicación.')
    })
  }, [])

  useEffect(() => {
    const saved = saveBudget(budget)
    if (!saved && !saveFailureAlerted.current) {
      saveFailureAlerted.current = true
      window.alert('No se pudieron guardar los cambios en este equipo. Exportá un respaldo antes de cerrar la aplicación.')
    } else if (saved) {
      saveFailureAlerted.current = false
    }
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
        const currentKey = currentMonthKey
        const elapsed = currentKey < startKey
          ? 0
          : Math.min(installments, Math.max(0,
              (Number(currentKey.slice(0, 4)) - year) * 12 +
              (Number(currentKey.slice(5)) - month) + 1,
            ))
        remainingInstallments = Math.max(0, installments - elapsed)
        totalRemaining = amount - Math.floor(amount * elapsed / installments)
      }
      const monthlyPayment = getCreditMonthlyPayment({
        ...credit,
        duration,
        amount,
        installments,
        baseMonthlyPayment,
        startKey,
        endKey,
      }, currentMonthKey)
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
  }, [budget.credits, currentMonthKey])

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
      const creditCommitment = transactions
        .filter((tx) => tx.isCreditInstallment)
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
      const totalExpense = expense
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
  }, [budget.monthlyRecords, budget.year])

  const annualTotals = useMemo(() => {
    const income = monthSummaries.reduce((sum, month) => sum + month.income, 0)
    const expense = monthSummaries.reduce((sum, month) => sum + month.expense, 0)
    return {
      income,
      expense,
      balance: income - expense,
    }
  }, [monthSummaries])

  const activeCredits = useMemo(() => {
    const currentMonth = currentMonthKey
    return creditDetails.filter((credit) => (
      credit.duration === 'ongoing'
        ? credit.startKey <= currentMonth
        : credit.startKey <= currentMonth && credit.remainingInstallments > 0
    ))
  }, [creditDetails, currentMonthKey])

  const creditMonthlyCommitmentThisMonth = useMemo(() => {
    const currentKey = currentMonthKey
    return creditDetails.reduce((sum, credit) => sum + monthCreditCommitment(credit, currentKey), 0)
  }, [creditDetails, currentMonthKey])

  function addTransaction(transaction) {
    const monthKey = getMonthKeyFromDate(transaction.date)
    setBudget((prev) => {
      const usedIds = new Set(Object.values(prev.monthlyRecords).flatMap((record) => (
        Array.isArray(record?.transactions) ? record.transactions.map((item) => item.id) : []
      )))
      const requestedId = transaction.id
      const newTransaction = {
        ...transaction,
        id: requestedId !== undefined && requestedId !== null && !usedIds.has(requestedId)
          ? requestedId
          : createTransactionId(prev.monthlyRecords),
      }
      const existing = prev.monthlyRecords[monthKey] || { transactions: [] }
      return {
        ...prev,
        monthlyRecords: {
          ...prev.monthlyRecords,
          [monthKey]: {
            ...existing,
            transactions: [newTransaction, ...existing.transactions],
            appliedRecurringIds: newTransaction.sourceRecurringId
              ? [...new Set([...(Array.isArray(existing.appliedRecurringIds) ? existing.appliedRecurringIds : []), newTransaction.sourceRecurringId])]
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
    setBudget((prev) => {
      const credits = prev.credits.map((credit) => {
        if (credit.id !== creditId) return credit
        const paymentChanges = [...(credit.paymentChanges || [])]
        const existingIndex = paymentChanges.findIndex((change) => change.effectiveMonth === effectiveMonth)
        const change = { effectiveMonth, monthlyPayment }
        if (existingIndex >= 0) paymentChanges[existingIndex] = change
        else paymentChanges.push(change)
        return { ...credit, paymentChanges }
      })
      const currentRecord = prev.monthlyRecords[effectiveMonth]
      const monthlyRecords = currentRecord
        ? {
            ...prev.monthlyRecords,
            [effectiveMonth]: {
              ...currentRecord,
              transactions: currentRecord.transactions.map((transaction) => (
                transaction.sourceCreditId === creditId &&
                transaction.sourceCreditMonth === effectiveMonth &&
                transaction.isCreditInstallment
                  ? { ...transaction, amount: monthlyPayment }
                  : transaction
              )),
            },
          }
        : prev.monthlyRecords
      return { ...prev, credits, monthlyRecords }
    })
  }

  function addRecurringRule(rule) {
    const newRule = { ...rule, id: Date.now(), active: true, dayOfMonth: 1, endMonth: '' }
    setBudget((prev) => ({ ...prev, recurringRules: [newRule, ...(prev.recurringRules || [])] }))
  }

  function updateRecurringRule(rule) {
    setBudget((prev) => ({
      ...prev,
      recurringRules: (prev.recurringRules || []).map((item) => item.id === rule.id ? rule : item),
    }))
  }

  function closeRecurringRule(ruleId, includeCurrentMonth) {
    setBudget((prev) => closeRecurringRuleState(prev, ruleId, currentMonthKey, includeCurrentMonth))
  }

  const applyMonthlyTransactions = useCallback((monthKey) => {
    setBudget((prev) => applyScheduledTransactions(prev, monthKey))
  }, [])

  function addCreditExtraExpense(creditId, monthKey, amount) {
    setBudget((prev) => addCreditExtraExpenseToBudget(prev, creditId, monthKey, amount))
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

  async function importBackup(contents) {
    const parsed = JSON.parse(contents)
    const backup = parsed?.schemaVersion === undefined ? { schemaVersion: 1, data: parsed } : parsed
    if (backup?.schemaVersion !== 1 || !isValidBackupData(backup.data)) {
      throw new Error('El archivo no tiene un respaldo válido de Gestión Financiera.')
    }
    const restored = { ...backup.data, recurringRules: backup.data.recurringRules || [] }
    const currentData = localStorage.getItem(STORAGE_KEY)
    if (isTauri() && currentData) {
      await invoke('create_local_backup', { contents: currentData, timestamp: createBackupTimestamp() })
    }
    if (!saveBudget(restored)) {
      throw new Error('No se pudo guardar el respaldo en este equipo. Los datos actuales se conservaron.')
    }
    setBudget(restored)
  }

  return {
    year: budget.year,
    monthlyRecords: budget.monthlyRecords,
    credits: budget.credits,
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
    addCreditExtraExpense,
    addRecurringRule,
    updateRecurringRule,
    closeRecurringRule,
    applyMonthlyTransactions,
    removeCredit,
  }
}
