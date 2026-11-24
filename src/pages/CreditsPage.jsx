import { formatCurrency } from '../utils/format'
import CreditForm from '../components/CreditForm'
import CreditList from '../components/CreditList'

export default function CreditsPage({ activeCredits, creditMonthlyCommitmentThisMonth, addCredit, removeCredit, updateCreditPayment, addCreditExtraExpense }) {
  return (
    <div className="page dashboard-page">
      <section className="section hero-card">
        <div className="page-header">
          <div>
            <p className="eyebrow">Gestión de cuotas</p>
            <h1>Créditos y compromisos</h1>
          </div>
        </div>

        <div className="card-grid summary-grid credit-summary-grid">
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
        <div className="credit-layout management-layout">
          <div className="credit-panel">
            <CreditForm onAdd={addCredit} />
          </div>
          <div className="credit-panel credit-list-panel">
            <CreditList credits={activeCredits} onDelete={removeCredit} onChangePayment={updateCreditPayment} onAddExtraExpense={addCreditExtraExpense} />
          </div>
        </div>
      </section>
    </div>
  )
}
