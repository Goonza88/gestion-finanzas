import React from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils/format'
import CreditForm from '../components/CreditForm'
import CreditList from '../components/CreditList'

export default function CreditsPage({ activeCredits, creditMonthlyCommitmentThisMonth, addCredit, removeCredit }) {
  return (
    <div className="page dashboard-page">
      <section className="section hero-card">
        <div className="page-header">
          <div>
            <p className="eyebrow">Gestión de cuotas</p>
            <h1>Créditos y compromisos</h1>
          </div>
          <Link to="/" className="ghost-button small">
            Volver al panel
          </Link>
        </div>

        <div className="card-grid summary-grid">
          <article className="summary-card">
            <p>Cuotas activas</p>
            <strong>{activeCredits.length}</strong>
          </article>
          <article className="summary-card">
            <p>Pago mensual total</p>
            <strong>{formatCurrency(creditMonthlyCommitmentThisMonth)}</strong>
          </article>
        </div>
      </section>

      <section className="section credit-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Agregar nueva cuota</p>
            <h2>Registrar un compromiso recurrente</h2>
          </div>
          <p className="section-helper">Los compromisos se suman automáticamente a los egresos mensuales.</p>
        </div>

        <div className="credit-layout">
          <div className="credit-panel">
            <CreditForm onAdd={addCredit} />
          </div>
          <div className="credit-panel credit-list-panel">
            <CreditList credits={activeCredits} onDelete={removeCredit} />
          </div>
        </div>
      </section>
    </div>
  )
}
