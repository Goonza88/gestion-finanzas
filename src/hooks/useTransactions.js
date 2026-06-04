import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'gestion_ingresos_transactions_v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    console.error('Error cargando transacciones:', e)
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('Error guardando transacciones:', e)
  }
}

export default function useTransactions() {
  const [transactions, setTransactions] = useState(() => load())

  useEffect(() => {
    save(transactions)
  }, [transactions])

  function addTransaction(tx) {
    setTransactions((prev) => [tx, ...prev])
  }

  function removeTransaction(id) {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const totals = useMemo(() => {
    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
    const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
    return {
      income,
      expense,
      balance: income - expense,
    }
  }, [transactions])

  return { transactions, addTransaction, removeTransaction, totals }
}
