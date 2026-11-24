import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils/format'
import { getMonthLabel } from '../utils/date'
import useCurrentMonthKey from '../hooks/useCurrentMonthKey'
import MonthCard from '../components/MonthCard'

export default function DashboardPage({
  year,
  annualTotals,
  monthSummaries,
  monthlyRecords,
  activeCredits,
  creditMonthlyCommitmentThisMonth,
  changeYear,
  recurringRules,
  applyMonthlyTransactions,
}) {
  const [monthsExpanded, setMonthsExpanded] = useState(false)
  const currentKey = useCurrentMonthKey()
  const currentTransactions = monthlyRecords[currentKey]?.transactions || []
  const currentIncome = currentTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
  const currentExpense = currentTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
  const currentCreditCount = new Set(currentTransactions
    .filter((transaction) => (
      transaction.isCreditInstallment === true &&
      transaction.sourceCreditId !== undefined &&
      transaction.sourceCreditId !== null
    ))
    .map((transaction) => transaction.sourceCreditId)).size
  const currentRecurringCount = new Set(currentTransactions
    .filter((transaction) => transaction.sourceRecurringId !== undefined && transaction.sourceRecurringId !== null)
    .map((transaction) => transaction.sourceRecurringId)).size
  const currentRepetitions = recurringRules.filter((rule) => (
    rule.active !== false && rule.startMonth <= currentKey && (!rule.endMonth || currentKey <= rule.endMonth)
  ))
  const recurringMonthlyNet = currentRepetitions.reduce((sum, rule) => (
    sum + (rule.type === 'income' ? 1 : -1) * Number(rule.amount || 0)
  ), 0)
  const combinedMonthlyCommitment = creditMonthlyCommitmentThisMonth + recurringMonthlyNet

  function formatSignedCurrency(amount) {
    return `${amount < 0 ? '−' : '+'} ${formatCurrency(Math.abs(amount))}`
  }

  useEffect(() => {
    if (String(year) === currentKey.slice(0, 4)) applyMonthlyTransactions(currentKey)
  }, [applyMonthlyTransactions, currentKey, recurringRules, year])

  return (
    <div className="page dashboard-page">
      <section className="section hero-card">
        <div className="page-header">
          <div>
            <p className="eyebrow">Resumen anual</p>
            <h1>Finanzas {year}</h1>
          </div>
          <div className="action-buttons" aria-label="Cambiar año">
            <button type="button" className="ghost-button small" onClick={() => changeYear(year - 1)} aria-label="Ver año anterior">
              ←
            </button>
            <button type="button" className="ghost-button small" onClick={() => changeYear(year + 1)} aria-label="Ver año siguiente">
              →
            </button>
          </div>
        </div>

        <div className="card-grid summary-grid">
          <article className="summary-card">
            <p>Ingresos anuales</p>
            <strong>{formatCurrency(annualTotals.income)}</strong>
          </article>
          <article className="summary-card negative">
            <p>Egresos anuales</p>
            <strong>{formatCurrency(annualTotals.expense)}</strong>
          </article>
          <article className="summary-card">
            <p>Balance anual</p>
            <strong>{formatCurrency(annualTotals.balance)}</strong>
          </article>
        </div>
      </section>

      <section className="section current-month-panel">
        <div className="section-header-row">
          <div>
            <p className="eyebrow">Mes actual</p>
            <h2>{getMonthLabel(currentKey)}</h2>
          </div>
          <Link to={`/mes/${currentKey}`} className="ghost-button small">
            Ver mes actual
          </Link>
        </div>
        <div className="dashboard-metric-grid" aria-label="Resumen del mes actual">
          <article className="summary-card">
            <p>Ingresos</p>
            <strong>{formatCurrency(currentIncome)}</strong>
          </article>
          <article className="summary-card negative">
            <p>Egresos</p>
            <strong>{formatCurrency(currentExpense)}</strong>
          </article>
          <article className="summary-card">
            <p>Movimientos</p>
            <strong>{currentTransactions.length}</strong>
          </article>
          <article className="summary-card">
            <p>Cuotas</p>
            <strong>{currentCreditCount}</strong>
          </article>
          <article className="summary-card">
            <p>Repeticiones</p>
            <strong>{currentRecurringCount}</strong>
          </article>
        </div>
      </section>

      <section className="section installments-panel">
        <div className="section-header-row">
          <div>
            <p className="eyebrow">Compromisos actuales</p>
            <h2>Resumen de cuotas y repeticiones</h2>
          </div>
          <Link to="/cuotas" className="ghost-button small">
            Gestionar cuotas
          </Link>
        </div>
        <div className="dashboard-metric-grid commitment-metric-grid">
          <article className="summary-card">
            <p>Cuotas activas</p>
            <strong>{activeCredits.length}</strong>
          </article>
          <article className="summary-card">
            <p>Pago mensual: cuotas</p>
            <strong>{formatCurrency(creditMonthlyCommitmentThisMonth)}</strong>
          </article>
          <article className="summary-card">
            <p>Repeticiones activas</p>
            <strong>{currentRepetitions.length}</strong>
          </article>
          <article className="summary-card">
            <p>Pago mensual: repeticiones</p>
            <strong>{formatSignedCurrency(recurringMonthlyNet)}</strong>
          </article>
          <article className="summary-card">
            <p>Pago mensual: combinado</p>
            <strong>{formatSignedCurrency(combinedMonthlyCommitment)}</strong>
          </article>
        </div>
      </section>

      <section className="section month-list-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Meses</p>
            <h2>
              <button
                type="button"
                className="month-list-toggle"
                aria-expanded={monthsExpanded}
                aria-controls="dashboard-month-grid"
                onClick={() => setMonthsExpanded((expanded) => !expanded)}
              >
                Resumen por mes
                <span className={`month-list-chevron${monthsExpanded ? ' expanded' : ''}`} aria-hidden="true" />
              </button>
            </h2>
          </div>
          {monthsExpanded && (
            <p className="section-helper">Selecciona un mes para ver ingresos y egresos detallados.</p>
          )}
        </div>
        <div id="dashboard-month-grid" className="month-grid" hidden={!monthsExpanded}>
          {monthSummaries.map((month) => (
            <Link key={month.monthKey} to={`/mes/${month.monthKey}`} className="link-card">
              <MonthCard month={month} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
