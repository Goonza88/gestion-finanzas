import { useState } from 'react'

export default function MonthTransactionForm({ defaultDate, transactionToEdit, onSave, onCancel }) {
  const [type, setType] = useState(transactionToEdit?.type || 'income')
  const [description, setDescription] = useState(transactionToEdit?.description || '')
  const [amount, setAmount] = useState(transactionToEdit?.amount?.toString() || '')
  const [date, setDate] = useState(transactionToEdit?.date || defaultDate)

  function handleSubmit(event) {
    event.preventDefault()
    const value = Number(amount)
    if (!description.trim()) {
      alert('Ingrese una descripción para el movimiento.')
      return
    }
    const intPart = String(amount).replace(/\D/g, '')
    if (intPart.length > 9) {
      alert('El monto no puede tener más de 9 dígitos.')
      return
    }
    if (!Number.isInteger(value) || value <= 0) {
      alert('Ingrese un monto entero positivo mayor que cero.')
      return
    }

    onSave({
      ...(transactionToEdit || {}),
      id: transactionToEdit?.id,
      type,
      description: description.trim(),
      amount: value,
      date,
    })
    // If we were adding a new transaction (not editing), reset the form
    if (!transactionToEdit) {
      setType('income')
      setDescription('')
      setAmount('')
      setDate(defaultDate)
    }
  }

  return (
    <form className="transaction-form" onSubmit={handleSubmit}>
      <h3>{transactionToEdit ? 'Editar movimiento' : 'Agregar movimiento'}</h3>
      <div className="form-row split">
        <label>
          Tipo
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="income">Ingreso</option>
            <option value="expense">Egreso</option>
          </select>
        </label>
        <label>
          Fecha
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </label>
      </div>
      <label>
        Descripción
          <input
            type="text"
            value={description}
            maxLength={25}
            onChange={(event) => setDescription(event.target.value.slice(0, 25))}
            placeholder="Ej. Venta, Medicamentos"
            required
          />
      </label>
      <label>
        Monto
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(event) => {
              const raw = event.target.value.replace(/\D/g, '')
              const newVal = raw.slice(0, 9)
              setAmount(newVal)
            }}
            placeholder="0"
            pattern="[0-9]+"
            required
          />
      </label>
      <div className="form-actions">
        <button type="submit" className="primary">
          {transactionToEdit ? 'Guardar cambios' : 'Guardar movimiento'}
        </button>
        {transactionToEdit && (
          <button type="button" className="ghost-button small" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
