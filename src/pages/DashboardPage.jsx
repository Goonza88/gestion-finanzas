import React from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils/format'
import { getMonthLabel } from '../utils/date'
import MonthCard from '../components/MonthCard'

export default function DashboardPage({
  year,
  annualTotals,
  monthSummaries,
  activeCredits,
  creditMonthlyCommitmentThisMonth,
}) {
  const currentKey = new Date().toISOString().slice(0, 7)
  const currentMonth = monthSummaries.find((month) => month.monthKey === currentKey) || monthSummaries[0]

  return (
    <div className="page dashboard-page">
      <section className="section hero-card">
        <div className="page-header">
          <div>
            <p className="eyebrow">Resumen anual</p>
            <h1>Finanzas {year}</h1>
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

      <section className="section installments-panel">
        <div className="section-header-row">
          <div>
            <p className="eyebrow">Cuotas actuales</p>
            <h2>Resumen de cuotas y compromisos</h2>
          </div>
          <Link to="/cuotas" className="ghost-button small">
            Gestionar cuotas
          </Link>
        </div>
        <div className="compact-card-row">
          <article className="summary-card compact-card">
            <p>Cuotas activas</p>
            <strong>{activeCredits.length}</strong>
          </article>
          <article className="summary-card compact-card">
            <p>Pago mensual</p>
            <strong>{formatCurrency(creditMonthlyCommitmentThisMonth)}</strong>
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
        {currentMonth && (
          <Link to={`/mes/${currentKey}`} className="link-card current-month-card">
            <MonthCard month={currentMonth} compact />
          </Link>
        )}
      </section>

      <section className="section month-list-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Meses</p>
            <h2>Resumen por mes</h2>
          </div>
          <p className="section-helper">Selecciona un mes para ver ingresos y egresos detallados.</p>
        </div>
        <div className="month-grid">
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
