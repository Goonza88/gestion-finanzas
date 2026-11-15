import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentMonthKey } from '../utils/date'
import { formatCurrency } from '../utils/format'

function RecurringRuleForm({ rule, onSave, onCancel }) {
  const [type, setType] = useState(rule?.type || 'expense')
  const [description, setDescription] = useState(rule?.description || '')
  const [amount, setAmount] = useState(rule ? String(rule.amount) : '')
  const [dayOfMonth, setDayOfMonth] = useState(rule ? String(rule.dayOfMonth) : '1')
  const [startMonth, setStartMonth] = useState(rule?.startMonth || getCurrentMonthKey())
  const [endMonth, setEndMonth] = useState(rule?.endMonth || '')

  function handleSubmit(event) {
    event.preventDefault()
    const parsedAmount = Number(amount)
    const parsedDay = Number(dayOfMonth)
    if (!description.trim() || !Number.isInteger(parsedAmount) || parsedAmount <= 0 || !Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      window.alert('Complete la descripción, un importe entero positivo y un día entre 1 y 31.')
      return
    }
    if (endMonth && endMonth < startMonth) {
      window.alert('El mes de finalización no puede ser anterior al inicio.')
      return
    }

    onSave({
      id: rule?.id,
      type,
      description: description.trim(),
      amount: parsedAmount,
      dayOfMonth: parsedDay,
      startMonth,
      endMonth,
    })
    if (!rule) {
      setDescription('')
      setAmount('')
    }
  }

  return (
    <form className="transaction-form" onSubmit={handleSubmit}>
      <h3>{rule ? 'Editar repetición' : 'Agregar repetición'}</h3>
      <label>
        Tipo
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </select>
      </label>
      <label>
        Descripción
        <input type="text" maxLength={40} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej. Alquiler" required />
      </label>
      <div className="form-row split">
        <label>
          Importe
          <input type="text" inputMode="numeric" pattern="[0-9]+" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))} placeholder="0" required />
        </label>
        <label>
          Día del mes
          <input type="number" min="1" max="31" step="1" value={dayOfMonth} onChange={(event) => setDayOfMonth(event.target.value)} required />
        </label>
      </div>
      <div className="form-row split">
        <label>
          Desde
          <input type="month" value={startMonth} onChange={(event) => setStartMonth(event.target.value)} required />
        </label>
        <label>
          Hasta (opcional)
          <input type="month" value={endMonth} onChange={(event) => setEndMonth(event.target.value)} />
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="primary">{rule ? 'Guardar cambios' : 'Crear repetición'}</button>
        {rule && <button type="button" className="ghost-button small" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  )
}

export default function RecurringPage({ recurringRules, addRecurringRule, updateRecurringRule, removeRecurringRule }) {
  const [editingRule, setEditingRule] = useState(null)

  function handleSave(rule) {
    if (rule.id) updateRecurringRule(rule)
    else addRecurringRule(rule)
    setEditingRule(null)
  }

  return (
    <div className="page dashboard-page">
      <section className="section hero-card">
        <div className="page-header">
          <div>
            <p className="eyebrow">Movimientos recurrentes</p>
            <h1>Gastos e ingresos comunes</h1>
          </div>
          <Link to="/" className="ghost-button small">Volver al resumen</Link>
        </div>
        <p className="section-helper">Se agregan automáticamente la primera vez que visitas cada mes. Los movimientos ya cargados no se duplican; puedes editarlos o eliminarlos como cualquier otro.</p>
      </section>

      <section className="section credit-layout">
        <div className="credit-panel">
          <RecurringRuleForm key={editingRule?.id ?? 'new'} rule={editingRule} onSave={handleSave} onCancel={() => setEditingRule(null)} />
        </div>
        <div className="credit-list-card">
          <div className="credit-list-header">
            <h3>Repeticiones configuradas</h3>
            <span className="pill">{recurringRules.length}</span>
          </div>
          {recurringRules.length === 0 ? (
            <p className="empty-state">Todavía no hay gastos o ingresos recurrentes.</p>
          ) : recurringRules.map((rule) => (
            <article key={rule.id} className="credit-card">
              <div>
                <p className="credit-name">{rule.description}</p>
                <p className="credit-meta">{(rule.type === 'income' ? 'Ingreso' : 'Gasto') + ' · día ' + rule.dayOfMonth + ' · desde ' + rule.startMonth + (rule.endMonth ? ' hasta ' + rule.endMonth : '')}</p>
              </div>
              <div className="credit-right">
                <p className="credit-value">{formatCurrency(rule.amount)}</p>
                <div className="action-buttons">
                  <button type="button" className="ghost-button small" onClick={() => setEditingRule(rule)}>Editar</button>
                  <button type="button" className="ghost-button small danger" onClick={() => {
                    if (window.confirm('¿Eliminar la repetición de “' + rule.description + '”?')) removeRecurringRule(rule.id)
                  }}>Eliminar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

