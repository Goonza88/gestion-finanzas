import { useRef, useState } from 'react'
import { getCurrentMonthKey, getMonthLabel } from '../utils/date'
import { formatCurrency } from '../utils/format'
import ConfirmationDialog from './ConfirmationDialog'

function formatLongDate(dateValue) {
  const match = String(dateValue || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return dateValue || '—'
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getCreditFinalDate(credit) {
  if (credit.duration !== 'fixed') return ''
  const match = String(credit.startDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  const [, yearText, monthText, dayText] = match
  const startYear = Number(yearText)
  const startMonth = Number(monthText)
  const installments = Number(credit.installments) || 1
  if (installments === 1) return credit.startDate
  const finalMonth = new Date(startYear, startMonth - 1 + installments - 1, 1)
  return `${finalMonth.getFullYear()}-${String(finalMonth.getMonth() + 1).padStart(2, '0')}-01`
}

function CreditCard({ credit, onRequestDelete, onChangePayment, onAddExtraExpense }) {
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
    <article className="credit-card credit-installment-card">
      <div className="credit-installment-header">
        <p className="credit-name">{credit.name}</p>
        <p className="credit-value">{formatCurrency(credit.monthlyPayment)} / Mes</p>
      </div>
      <div className="credit-installment-row">
        {credit.duration === 'fixed' ? (
          <>
            <span>Cuotas totales: {credit.installments}</span>
            <span>Cuotas restantes: {credit.remainingInstallments}</span>
          </>
        ) : (
          <>
            <span>Compromiso mensual sin vencimiento</span>
            <span>Cuotas restantes: —</span>
          </>
        )}
      </div>
      <div className="credit-installment-row">
        <span>Inicio: {formatLongDate(credit.startDate)}</span>
        <span>Finalización: {credit.duration === 'fixed' ? formatLongDate(getCreditFinalDate(credit)) : 'Sin vencimiento'}</span>
      </div>
      <div className="credit-installment-row credit-installment-footer">
        <span>{credit.duration === 'fixed' ? `Pago total: ${formatCurrency(credit.totalPrice)}` : 'Pago total: —'}</span>
        <div className="action-buttons credit-action-buttons">
          {credit.duration === 'ongoing' && (
            <button type="button" className="ghost-button small" onClick={() => {
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
            </button>
          )}
          <button type="button" className="ghost-button small" onClick={() => setShowExtraForm((open) => !open)}>
            Agregar costo adicional
          </button>
          <button type="button" className="ghost-button small danger" onClick={(event) => onRequestDelete(credit, event.currentTarget)}>
            Eliminar
          </button>
        </div>
      </div>
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
    </article>
  )
}

export default function CreditList({ credits, onDelete, onChangePayment, onAddExtraExpense }) {
  const [creditPendingDelete, setCreditPendingDelete] = useState(null)
  const deleteTriggerRef = useRef(null)

  function requestDelete(credit, trigger) {
    deleteTriggerRef.current = trigger
    setCreditPendingDelete(credit)
  }

  function closeDeleteDialog() {
    setCreditPendingDelete(null)
    window.requestAnimationFrame(() => deleteTriggerRef.current?.focus())
  }

  function confirmDelete(removeCurrentMonth) {
    onDelete(creditPendingDelete.id, removeCurrentMonth)
    closeDeleteDialog()
  }

  return (
    <div className="credit-list-card">
      <div className="credit-list-header">
        <h3>Créditos activos</h3>
      </div>
      {credits.length === 0 ? (
        <p className="empty-state">No hay créditos registrados. Añadí uno para comenzar.</p>
      ) : (
        <div className="credit-list">
          {credits.map((credit) => (
            <CreditCard key={credit.id} credit={credit} onRequestDelete={requestDelete} onChangePayment={onChangePayment} onAddExtraExpense={onAddExtraExpense} />
          ))}
        </div>
      )}
      {creditPendingDelete && (
        <ConfirmationDialog
          title="Eliminar crédito"
          description={`Se eliminará “${creditPendingDelete.name}” de los créditos activos y sus pagos futuros. ¿Qué querés hacer con el movimiento actual de ${getMonthLabel(getCurrentMonthKey())}?`}
          dialogClassName="wide-dialog plain-dialog"
          onCancel={closeDeleteDialog}
          actions={[
            { label: 'Cancelar', onClick: closeDeleteDialog },
            { label: 'Conservar este mes', onClick: () => confirmDelete(false) },
            { label: 'Eliminar también este mes', variant: 'danger', onClick: () => confirmDelete(true) },
          ]}
        />
      )}
    </div>
  )
}
