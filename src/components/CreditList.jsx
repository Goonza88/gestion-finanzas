import { useState } from 'react'
import { getCurrentMonthKey } from '../utils/date'
import { formatCurrency } from '../utils/format'

function CreditCard({ credit, onDelete, onChangePayment, onAddExtraExpense }) {
  const [showExtraForm, setShowExtraForm] = useState(false)
  const [extraMonth, setExtraMonth] = useState(getCurrentMonthKey())
  const [extraAmount, setExtraAmount] = useState('')

  function handleExtraExpense(event) {
    event.preventDefault()
    const amount = Number(extraAmount)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(extraMonth) || !Number.isSafeInteger(amount) || amount <= 0) {
      window.alert('Elegí un mes y un importe entero mayor que cero.')
      return
    }
    onAddExtraExpense(credit.id, extraMonth, amount)
    setExtraAmount('')
    setShowExtraForm(false)
  }

  return (
    <article className="credit-card">
      <div className="credit-information">
        <p className="credit-name">{credit.name}</p>
        <p className="credit-meta">{credit.duration === 'ongoing' ? 'Sin vencimiento' : `${credit.installments} cuotas`} · desde {credit.startDate}</p>
      </div>
      <div className="credit-right">
        <p className="credit-value">{formatCurrency(credit.monthlyPayment)} / mes</p>
        {credit.duration === 'fixed' && <>
          <p className="credit-small">Restan {credit.remainingInstallments} cuotas</p>
          <p className="credit-small">Saldo estimado según calendario: {formatCurrency(credit.totalRemaining)}</p>
          <p className="credit-small">Supone pagadas las cuotas de los meses transcurridos, incluido el actual.</p>
        </>}
        {credit.duration === 'ongoing' && <button type="button" className="ghost-button small" onClick={() => {
          const entered = window.prompt(`Nuevo importe mensual para ${credit.name}:`, String(credit.monthlyPayment))
          if (entered === null) return
          const amount = Number(entered)
          if (!Number.isSafeInteger(amount) || amount <= 0) {
            window.alert('Ingrese un importe entero mayor que cero.')
            return
          }
          onChangePayment(credit.id, amount)
        }}>
          Cambiar importe
        </button>}
        <button type="button" className="ghost-button small" onClick={() => setShowExtraForm((open) => !open)}>
          Agregar gasto adicional
        </button>
        {showExtraForm && (
          <form className="credit-extra-form" onSubmit={handleExtraExpense}>
            <label>
              Mes del gasto
              <input type="month" value={extraMonth} onChange={(event) => setExtraMonth(event.target.value)} required />
            </label>
            <label>
              Importe adicional
              <input type="text" inputMode="numeric" pattern="[0-9]+" value={extraAmount} onChange={(event) => setExtraAmount(event.target.value.replace(/\D/g, ''))} placeholder="0" required />
            </label>
            <div className="form-actions">
              <button type="submit" className="primary small">Guardar gasto</button>
              <button type="button" className="ghost-button small" onClick={() => setShowExtraForm(false)}>Cancelar</button>
            </div>
            <p className="small-text">Queda registrado como gasto del mes y no modifica las cuotas restantes.</p>
          </form>
        )}
        <button type="button" className="ghost-button small danger" onClick={() => {
          if (window.confirm(`¿Eliminar el compromiso "${credit.name}"? Los gastos ya registrados se conservan.`)) onDelete(credit.id)
        }}>
          Eliminar
        </button>
      </div>
    </article>
  )
}

export default function CreditList({ credits, onDelete, onChangePayment, onAddExtraExpense }) {
  return (
    <div className="credit-list-card">
      <div className="credit-list-header">
        <h3>Créditos activos</h3>
        <span className="pill">{credits.length} activos</span>
      </div>
      {credits.length === 0 ? (
        <p className="empty-state">No hay créditos registrados. Añadí uno para comenzar.</p>
      ) : (
        <div className="credit-list">
          {credits.map((credit) => (
            <CreditCard key={credit.id} credit={credit} onDelete={onDelete} onChangePayment={onChangePayment} onAddExtraExpense={onAddExtraExpense} />
          ))}
        </div>
      )}
    </div>
  )
}
