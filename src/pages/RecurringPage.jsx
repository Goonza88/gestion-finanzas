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
      <h3>{rule ? 'Editar repetición' : 'Nueva repetición'}</h3>
      <div className="recurring-form-grid">
        <div className="transaction-type-field full-width">
          <span>Tipo</span>
          <div className="transaction-type-buttons" role="group" aria-label="Tipo de repetición">
            <button
              type="button"
              className={`transaction-type-button income ${type === 'income' ? 'selected' : ''}`}
              aria-pressed={type === 'income'}
              onClick={() => setType('income')}
            >
              Ingreso
            </button>
            <button
              type="button"
              className={`transaction-type-button expense ${type === 'expense' ? 'selected' : ''}`}
              aria-pressed={type === 'expense'}
              onClick={() => setType('expense')}
            >
              Egreso
            </button>
          </div>
        </div>
        <label className="full-width">
          Descripción
          <input type="text" maxLength={40} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej. Alquiler" required />
        </label>
        <label>
          Monto mensual
          <input type="text" inputMode="numeric" pattern="[0-9]+" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))} placeholder="0" required />
        </label>
        <MonthPicker label="Desde" value={startMonth} onChange={setStartMonth} />
        <div className="form-actions full-width">
          <button type="submit" className="primary">{rule ? 'Guardar cambios' : 'Agregar repetición'}</button>
          {rule && <button type="button" className="ghost-button small" onClick={onCancel}>Cancelar</button>}
        </div>
      </div>
    </form>
  )
}

function RecurringRuleCard({ rule, history, onEdit, onDelete }) {
  return (
    <article className="credit-card recurring-card recurring-rule-card">
      <div className="recurring-card-header">
        <p className="credit-name">{rule.description}</p>
        <p className="credit-value">{formatCurrency(rule.amount)} / Mes</p>
      </div>
      <div className="recurring-card-row">
        <span>{(rule.type === 'income' ? 'Ingreso' : 'Egreso') + ` · Desde ${getMonthLabel(rule.startMonth)}`}</span>
        <span>Meses acumulados: {history.months}</span>
      </div>
      <div className="recurring-card-row recurring-card-footer">
        <span>Pago acumulado: {formatCurrency(history.total)}</span>
        {rule.active !== false ? (
          <div className="action-buttons recurring-action-buttons">
            <button type="button" className="ghost-button small" onClick={() => onEdit(rule)}>Editar</button>
            <button type="button" className="ghost-button small danger" onClick={() => onDelete(rule)}>Eliminar</button>
          </div>
        ) : <span className="pill">Finalizada</span>}
      </div>
    </article>
  )
}

export default function RecurringPage({ recurringRules, monthlyRecords, addRecurringRule, updateRecurringRule, closeRecurringRule }) {
  const [editingRule, setEditingRule] = useState(null)
  const [closingRule, setClosingRule] = useState(null)
  const currentMonthKey = getCurrentMonthKey()
  const activeRules = recurringRules.filter((rule) => rule.active !== false)
  const archivedRules = recurringRules.filter((rule) => rule.active === false)
  const monthlyIncome = activeRules
    .filter((rule) => rule.type === 'income')
    .reduce((sum, rule) => sum + Number(rule.amount || 0), 0)
  const monthlyExpense = activeRules
    .filter((rule) => rule.type === 'expense')
    .reduce((sum, rule) => sum + Number(rule.amount || 0), 0)

  function handleSave(rule) {
    if (rule.id !== undefined && rule.id !== null) {
      const applyToCurrentMonth = window.confirm(
        `¿Aplicar los cambios también a ${getMonthLabel(currentMonthKey)}? Si elegís No, se aplicarán desde el mes siguiente. Los meses anteriores se conservan.`,
      )
      updateRecurringRule(rule, applyToCurrentMonth)
    } else {
      addRecurringRule(rule)
    }
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
        <div className="card-grid recurring-summary-grid">
          <article className="summary-card">
            <p>Cantidad de repeticiones activas</p>
            <strong>{activeRules.length}</strong>
          </article>
          <article className="summary-card">
            <p>Ingresos mensuales</p>
            <strong>{formatCurrency(monthlyIncome)}</strong>
          </article>
          <article className="summary-card negative">
            <p>Egresos mensuales</p>
            <strong>{formatCurrency(monthlyExpense)}</strong>
          </article>
        </div>
      </section>

      <section className="section credit-layout management-layout recurring-layout">
        <div className="credit-panel">
          <RecurringRuleForm key={editingRule?.id ?? 'new'} rule={editingRule} onSave={handleSave} onCancel={() => setEditingRule(null)} />
        </div>
        <div className="credit-list-card">
          <div className="credit-list-header">
            <h3>Repeticiones activas</h3>
            <span className="pill">{activeRules.length} activas</span>
          </div>
          {activeRules.length === 0 ? (
            <p className="empty-state">Todavía no hay gastos o ingresos recurrentes activos.</p>
          ) : (
            <div className="credit-list">
              {activeRules.map((rule) => (
                <RecurringRuleCard key={rule.id} rule={rule} history={summarizeRecurringHistory(rule, monthlyRecords)} onEdit={setEditingRule} onDelete={setClosingRule} />
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
                    onDelete={setClosingRule}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </section>

      {closingRule && (
        <div className="modal-backdrop" role="presentation">
          <section className="decision-modal" role="dialog" aria-modal="true" aria-labelledby="delete-recurring-title">
            <h2 id="delete-recurring-title">Eliminar repetición</h2>
            <p>Vas a eliminar “{closingRule.description}”. ¿También se elimina su movimiento de {getMonthLabel(currentMonthKey)}? Los meses siguientes se eliminan siempre.</p>
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
