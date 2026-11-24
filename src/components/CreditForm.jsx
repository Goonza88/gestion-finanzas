import { useState } from 'react'
import { getCurrentDateISO } from '../utils/date'

export default function CreditForm({ onAdd }) {
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('fixed')
  const [totalPrice, setTotalPrice] = useState('')
  const [installments, setInstallments] = useState('12')
  const [startDate, setStartDate] = useState(getCurrentDateISO())

  function handleSubmit(event) {
    event.preventDefault()
    const price = Number(totalPrice)
    const quota = Number(installments)
    if (!name.trim() || !Number.isInteger(price) || price <= 0 || (duration === 'fixed' && (!Number.isInteger(quota) || quota <= 0 || quota > price))) {
      alert('Complete el nombre y los importes. La cantidad de cuotas no puede superar el precio en pesos enteros.')
      return
    }

    const credit = {
      name: name.trim(),
      duration,
      totalPrice: duration === 'fixed' ? price : 0,
      installments: duration === 'fixed' ? quota : null,
      monthlyPayment: duration === 'fixed' ? Math.round(price / quota) : price,
      startDate,
    }
    onAdd(credit)
    setName('')
    setDuration('fixed')
    setTotalPrice('')
    setInstallments('12')
    setStartDate(getCurrentDateISO())
  }

  return (
    <form className="credit-form" onSubmit={handleSubmit}>
      <h3>Agregar crédito</h3>
      <label>
        Nombre del gasto
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
        Tipo de compromiso
        <select value={duration} onChange={(event) => setDuration(event.target.value)}>
          <option value="fixed">Compra con cantidad de cuotas</option>
          <option value="ongoing">Pago mensual sin vencimiento</option>
        </select>
      </label>
      <label>
        {duration === 'fixed' ? 'Precio total' : 'Importe mensual'}
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
      {duration === 'fixed' && <label>
        Cuotas
        <input type="number" min="1" step="1" value={installments} onChange={(event) => setInstallments(event.target.value)} placeholder="12" required />
      </label>}
      <label>
        Fecha de inicio
        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
      </label>
      <button type="submit" className="primary">Agregar crédito</button>
    </form>
  )
}
