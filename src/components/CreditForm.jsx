import { useState } from 'react'
import { getCurrentDateISO } from '../utils/date'

export default function CreditForm({ onAdd }) {
  const [name, setName] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [installments, setInstallments] = useState('12')
  const [startDate, setStartDate] = useState(getCurrentDateISO())

  function handleSubmit(event) {
    event.preventDefault()
    const price = Number(totalPrice)
    const quota = Number(installments)
    if (!name.trim() || !Number.isInteger(price) || price <= 0 || !Number.isInteger(quota) || quota <= 0 || quota > price) {
      alert('Complete el nombre y los importes. La cantidad de cuotas no puede superar el precio en pesos enteros.')
      return
    }

    const credit = {
      name: name.trim(),
      duration: 'fixed',
      totalPrice: price,
      installments: quota,
      monthlyPayment: Math.round(price / quota),
      startDate,
    }
    onAdd(credit)
    setName('')
    setTotalPrice('')
    setInstallments('12')
    setStartDate(getCurrentDateISO())
  }

  return (
    <form className="credit-form" onSubmit={handleSubmit}>
      <h3>Nuevo crédito</h3>
      <div className="credit-form-grid">
        <label>
          Descripción
          <input
            type="text"
            maxLength="20"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Televisor"
            required
          />
        </label>
        <label>
          Fecha
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </label>
        <label>
          Precio total
          <input
            type="text"
            inputMode="numeric"
            maxLength="9"
            pattern="[0-9]+"
            value={totalPrice}
            onChange={(event) => setTotalPrice(event.target.value.replace(/\D/g, ''))}
            placeholder="0"
            required
          />
        </label>
        <label>
          Cuotas
          <input type="number" min="1" step="1" value={installments} onChange={(event) => setInstallments(event.target.value)} placeholder="12" required />
        </label>
        <button type="submit" className="primary credit-form-submit">Agregar crédito</button>
      </div>
    </form>
  )
}
