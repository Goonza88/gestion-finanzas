import React, { useState } from 'react'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function CreditForm({ onAdd }) {
  const [name, setName] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [installments, setInstallments] = useState('12')
  const [startDate, setStartDate] = useState(todayISO())

  function handleSubmit(event) {
    event.preventDefault()
    const price = Number(totalPrice)
    const quota = Number(installments)
    if (!name.trim() || !Number.isInteger(price) || price <= 0 || !Number.isInteger(quota) || quota <= 0) {
      alert('Complete nombre, precio total y cantidad de cuotas válidas.')
      return
    }

    const credit = {
      name: name.trim(),
      totalPrice: price,
      installments: quota,
      monthlyPayment: Math.round(price / quota),
      startDate,
    }
    onAdd(credit)
    setName('')
    setTotalPrice('')
    setInstallments('12')
    setStartDate(todayISO())
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
        <input
          type="number"
          min="1"
          step="1"
          value={installments}
          onChange={(event) => setInstallments(event.target.value)}
          placeholder="12"
          required
        />
      </label>
      <label>
        Fecha de inicio
        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
      </label>
      <button type="submit" className="primary">Agregar crédito</button>
    </form>
  )
}
