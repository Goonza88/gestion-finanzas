import React from 'react'
import { formatCurrency } from '../utils/format'

export default function MonthCard({ month }) {
  return (
    <article className="month-card">
      <div className="month-card-header">
        <p className="month-title">{month.label}</p>
      </div>
      <div className="month-card-grid">
        <div>
          <p>Ingresos</p>
          <strong>{formatCurrency(month.income)}</strong>
        </div>
        <div>
          <p>Egresos</p>
          <strong>{formatCurrency(month.expense + month.creditCommitment)}</strong>
        </div>
      </div>
      <div className="month-balance">
        <span>{formatCurrency(month.balance)}</span>
      </div>
        <span className={`month-badge ${month.balance >= 0 ? 'positive' : 'negative'}`}>
            {month.balance >= 0 ? 'Saldo +' : 'Saldo -'}
        </span>
    </article>
  )
}
