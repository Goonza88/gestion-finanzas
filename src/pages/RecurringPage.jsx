import { useState } from 'react'
import { MONTH_NAMES, getCurrentMonthKey, getMonthLabel } from '../utils/date'
import { formatCurrency } from '../utils/format'
import { summarizeRecurringHistory } from '../utils/monthlyRecords'

function MonthPicker({ label, value, onChange }) {
  const [year = '', month = '01'] = value.split('-')

  function updateMonth(nextMonth) {
    onChange(`${year}-${nextMonth}`)
  }

  function updateYear(nextYear) {
    onChange(`${nextYear}-${month}`)
  }

  return (
    <label>
      {label}
      <div className="month-picker">
        <select value={month} onChange={(event) => updateMonth(event.target.value)} required aria-label={`${label}: mes`}>
          {MONTH_NAMES.map((name, index) => (
            <option key={name} value={String(index + 1).padStart(2, '0')}>{name}</option>
          ))}
        </select>
        <input
          type="number"
          min="1900"
          max="9999"
          step="1"
          value={Number(year) || ''}
          onChange={(event) => updateYear(event.target.value)}
          required
          aria-label={`${label}: año`}
        />
      </div>
    </label>
  )
}

function RecurringRuleForm({ rule, onSave, onCancel }) {
  const [type, setType] = useState(rule?.type || 'expense')
  const [description, setDescription] = useState(rule?.description || '')
  const [amount, setAmount] = useState(rule ? String(rule.amount) : '')
  const [startMonth, setStartMonth] = useState(rule?.startMonth || getCurrentMonthKey())

  function handleSubmit(event) {
    event.preventDefault()
    const parsedAmount = Number(amount)
    if (
      !description.trim() ||
      !Number.isSafeInteger(parsedAmount) ||
      parsedAmount <= 0 ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth) ||
      Number(startMonth.slice(0, 4)) < 1900 ||
      Number(startMonth.slice(0, 4)) > 9999
    ) {
      window.alert('Complete la descripción, un importe entero positivo y un mes de inicio válido.')
      return
    }

    onSave({
      id: rule?.id,
      type,
      description: description.trim(),
      amount: parsedAmount,
      dayOfMonth: 1,
      startMonth,
      endMonth: rule?.endMonth || '',
      active: rule?.active ?? true,
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
      <label>
        Importe mensual
        <input type="text" inputMode="numeric" pattern="[0-9]+" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))} placeholder="0" required />
      </label>
      <MonthPicker label="Desde" value={startMonth} onChange={setStartMonth} />
      <div className="form-actions">
        <button type="submit" className="primary">{rule ? 'Guardar cambios' : 'Crear repetición'}</button>
        {rule && <button type="button" className="ghost-button small" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  )
}

function RecurringRuleCard({ rule, history, onEdit, onClose }) {
  return (
    <article className="credit-card recurring-card">
      <div>
        <p className="credit-name">{rule.description}</p>
        <p className="credit-meta">
          {(rule.type === 'income' ? 'Ingreso' : 'Gasto') + ` · Desde ${getMonthLabel(rule.startMonth)}`}
          {rule.active === false && rule.endMonth && rule.endMonth >= rule.startMonth ? ` · Hasta ${getMonthLabel(rule.endMonth)}` : ''}
          {rule.active === false && (!rule.endMonth || rule.endMonth < rule.startMonth) ? ' · Sin meses activos' : ''}
        </p>
        {rule.active === false && (
          <div className="recurring-history-meta">
            <span>{history.months} {history.months === 1 ? 'mes registrado' : 'meses registrados'}</span>
            <span>Total registrado: {formatCurrency(history.total)}</span>
          </div>
        )}
      </div>
      <div className="credit-right">
        <p className="credit-value">{formatCurrency(rule.amount)} / mes</p>
        {rule.active !== false ? (
          <div className="action-buttons">
            <button type="button" className="ghost-button small" onClick={() => onEdit(rule)}>Editar</button>
            <button type="button" className="ghost-button small danger" onClick={() => onClose(rule)}>Cerrar repetición</button>
          </div>
        ) : <span className="pill">Finalizada</span>}
      </div>
    </article>
  )
}

export default function RecurringPage({ recurringRules, monthlyRecords, addRecurringRule, updateRecurringRule, closeRecurringRule }) {
  const [editingRule, setEditingRule] = useState(null)
  const [closingRule, setClosingRule] = useState(null)
  const activeRules = recurringRules.filter((rule) => rule.active !== false)
  const archivedRules = recurringRules.filter((rule) => rule.active === false)

  function handleSave(rule) {
    if (rule.id !== undefined && rule.id !== null) updateRecurringRule(rule)
    else addRecurringRule(rule)
    setEditingRule(null)
  }

  function handleClose(includeCurrentMonth) {
    closeRecurringRule(closingRule.id, includeCurrentMonth)
    setClosingRule(null)
  }

  return (
    <div className="page recurring-page">
      <section className="section hero-card">
        <div className="page-header">
          <div>
            <p className="eyebrow">Movimientos recurrentes</p>
            <h1>Gastos e ingresos comunes</h1>
          </div>
        </div>
      </section>

      <section className="section credit-layout management-layout recurring-layout">
        <div className="credit-panel">
          <RecurringRuleForm key={editingRule?.id ?? 'new'} rule={editingRule} onSave={handleSave} onCancel={() => setEditingRule(null)} />
        </div>
        <div className="credit-list-card">
          <div className="credit-list-header">
            <h3>Repeticiones configuradas</h3>
            <span className="pill">{activeRules.length} activas</span>
          </div>
          {activeRules.length === 0 ? (
            <p className="empty-state">Todavía no hay gastos o ingresos recurrentes activos.</p>
          ) : (
            <div className="credit-list">
              {activeRules.map((rule) => (
                <RecurringRuleCard key={rule.id} rule={rule} history={{ months: 0, total: 0 }} onEdit={setEditingRule} onClose={setClosingRule} />
              ))}
            </div>
          )}
          {archivedRules.length > 0 && (
            <section className="recurring-history">
              <div className="credit-list-header">
                <h3>Repeticiones finalizadas</h3>
                <span className="pill">{archivedRules.length}</span>
              </div>
              <div className="credit-list">
                {archivedRules.map((rule) => (
                  <RecurringRuleCard
                    key={rule.id}
                    rule={rule}
                    history={summarizeRecurringHistory(rule, monthlyRecords)}
                    onEdit={setEditingRule}
                    onClose={setClosingRule}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </section>

      {closingRule && (
        <div className="modal-backdrop" role="presentation">
          <section className="decision-modal" role="dialog" aria-modal="true" aria-labelledby="close-recurring-title">
            <h2 id="close-recurring-title">Cerrar repetición</h2>
            <p>Vas a finalizar “{closingRule.description}”. ¿A este mes se le cuenta el pago?</p>
            <div className="form-actions">
              <button type="button" className="primary" onClick={() => handleClose(true)}>Sí</button>
              <button type="button" className="ghost-button" onClick={() => handleClose(false)}>No</button>
              <button type="button" className="ghost-button" onClick={() => setClosingRule(null)}>Cancelar</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
