import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatCurrency } from '../utils/format'
import { getCurrentDateISO, getMonthLabel, getMonthKeyFromDate } from '../utils/date'
import MonthTransactionForm from '../components/MonthTransactionForm'
import TransactionTable from '../components/TransactionTable'

export default function MonthPage({
  getMonthRecord,
  addTransaction,
  updateTransaction,
  removeTransaction,
  recurringRules,
  applyMonthlyTransactions,
}) {
  const { monthKey } = useParams()
  const monthData = getMonthRecord(monthKey)
  const monthLabel = getMonthLabel(monthKey)
  const transactions = monthData.transactions || []

  const income = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const expense = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const monthCreditPayments = transactions.filter((transaction) => transaction.isCreditInstallment)
  const creditCommitment = monthCreditPayments.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
  const totalExpense = expense
  const balance = income - totalExpense

  const defaultDateValue = (() => {
    const [year, month] = monthKey.split('-')
    if (!year || !month) return getCurrentDateISO()
    return `${year}-${String(month).padStart(2, '0')}-01`
  })()

  const [editingTransaction, setEditingTransaction] = useState(null)

  useEffect(() => {
    applyMonthlyTransactions(monthKey)
  }, [applyMonthlyTransactions, monthKey, recurringRules])

  function handleSave(transaction) {
    const actualKey = getMonthKeyFromDate(transaction.date)
    if (!actualKey) {
      window.alert('La fecha del movimiento no es válida.')
      return
    }
    if (transaction.id !== undefined && transaction.id !== null) {
      if (actualKey === monthKey) {
        updateTransaction(monthKey, transaction)
      } else {
        removeTransaction(monthKey, transaction.id)
        addTransaction({ ...transaction, id: transaction.id })
      }
    } else {
      addTransaction({ ...transaction, id: Date.now() })
    }
    setEditingTransaction(null)
  }

  function handleEdit(transaction) {
    setEditingTransaction(transaction)
  }

  function handleCancelEdit() {
    setEditingTransaction(null)
  }

  return (
    <div className="page month-page">
      <section className="section hero-card">
        <header className="page-header back-header">
          <div>
            <p className="eyebrow">Mes seleccionado</p>
            <h1>{monthLabel}</h1>
          </div>
          <Link to="/" className="ghost-button">
            ← Volver al resumen
          </Link>
        </header>

        <div className="card-grid month-summary-grid">
          <article className="summary-card">
            <p>Total ingresos</p>
            <strong>{formatCurrency(income)}</strong>
          </article>
          <article className="summary-card negative">
            <p>Total egresos</p>
            <strong>{formatCurrency(totalExpense)}</strong>
          </article>
          <article className="summary-card primary">
            <p>Balance mensual</p>
            <strong>{formatCurrency(balance)}</strong>
          </article>
        </div>
      </section>

      <section className="section month-detail-grid">
        <div className="transaction-panel left-column">
          <MonthTransactionForm
            key={editingTransaction?.id ?? `new-${monthKey}`}
            defaultDate={defaultDateValue}
            transactionToEdit={editingTransaction}
            onSave={handleSave}
            onCancel={handleCancelEdit}
          />
          <aside className="month-note-card">
            <p className="eyebrow">Cuotas registradas este mes</p>
            <strong>{formatCurrency(creditCommitment)}</strong>
            <p className="small-text">
              {monthCreditPayments.length === 0
                ? 'No hay pagos de cuotas en este mes.'
                : `Incluye ${monthCreditPayments.length} pago(s) de cuotas.`}
            </p>
          </aside>
        </div>

        <div className="transaction-panel right-column">
          <TransactionTable
            transactions={transactions}
            onDelete={(transactionId) => removeTransaction(monthKey, transactionId)}
            onEdit={handleEdit}
          />
        </div>
      </section>
    </div>
  )
}
