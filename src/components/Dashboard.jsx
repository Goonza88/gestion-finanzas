import React from 'react'
import { formatCurrency } from '../utils/format'

export default function Dashboard({ totals }) {
  return (
    <section className="dashboard" aria-label="Resumen">
      <div className="card balance">
        <div className="label">Balance</div>
        <div className="value">{formatCurrency(totals.balance)}</div>
      </div>
      <div className="card income">
        <div className="label">Ingresos</div>
        <div className="value">{formatCurrency(totals.income)}</div>
      </div>
      <div className="card expense">
        <div className="label">Egresos</div>
        <div className="value">{formatCurrency(totals.expense)}</div>
      </div>
    </section>
  )
}
