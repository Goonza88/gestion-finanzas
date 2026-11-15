import { useState } from 'react'
import { getCurrentDateISO } from '../utils/date'

export default function TransactionForm({ onAdd }) {
  const [type, setType] = useState('income')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(getCurrentDateISO())

  function handleSubmit(e) {
    e.preventDefault()
    const parsed = Number(amount)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      alert('Ingrese un monto entero válido (mayor que 0)')
      return
    }

    const transaction = {
      id: Date.now(),
      type,
      description: description.trim() || (type === 'income' ? 'Ingreso' : 'Egreso'),
      amount: Math.abs(parsed),
      date: date,
    }

    onAdd(transaction)
    // reset form
    setDescription('')
    setAmount('')
    setDate(getCurrentDateISO())
    setType('income')
  }

  return (
    <form className="form" onSubmit={handleSubmit} aria-label="Agregar movimiento">
      <div className="form-row">
        <label className="large-label">
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="income">Ingreso</option>
            <option value="expense">Egreso</option>
          </select>
        </label>
      </div>

      <div className="form-row">
        <label className="large-label">
          Descripción
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Jubilación, Compra en supermercado"
            required
          />
        </label>
      </div>

      <div className="form-row">
        <label className="large-label">
          Monto
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]+"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
            required
          />
        </label>
      </div>

      <div className="form-row">
        <label className="large-label">
          Fecha
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>

      <div className="form-row actions">
        <button type="submit" className="primary large">Guardar</button>
      </div>
    </form>
  )
}
