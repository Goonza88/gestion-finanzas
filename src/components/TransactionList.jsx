import React from 'react'
import { formatCurrency, formatDate } from '../utils/format'

export default function TransactionList({ transactions = [], onDelete }) {
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))

  function handleDelete(tx) {
    if (confirm(`¿Eliminar "${tx.description}" de ${formatCurrency(tx.amount)}?`)) {
      onDelete(tx.id)
    }
  }

  return (
    <section className="list" aria-label="Movimientos recientes">
      <h2>Movimientos</h2>
      <table className="tx-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th>Monto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan="4" className="empty">No hay movimientos</td>
            </tr>
          )}
          {sorted.map((tx) => (
            <tr key={tx.id} className={tx.type === 'income' ? 'tx-income' : 'tx-expense'}>
              <td>{formatDate(tx.date)}</td>
              <td className="desc">{tx.description}</td>
              <td className="amount">{tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}</td>
              <td>
                <button className="danger small" onClick={() => handleDelete(tx)} aria-label={`Eliminar ${tx.description}`}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
