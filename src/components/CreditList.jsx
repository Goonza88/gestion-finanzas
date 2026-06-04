import React from 'react'
import { formatCurrency } from '../utils/format'

export default function CreditList({ credits, onDelete }) {
  return (
    <div className="credit-list-card">
      <div className="credit-list-header">
        <h3>Créditos activos</h3>
        <span className="pill">{credits.length} activos</span>
      </div>
      {credits.length === 0 ? (
        <p className="empty-state">No hay créditos registrados. Añade un crédito para comenzar.</p>
      ) : (
        <div className="credit-list">
          {credits.map((credit) => (
            <article key={credit.id} className="credit-card">
              <div>
                <p className="credit-name">{credit.name}</p>
                <p className="credit-meta">{credit.installments} cuotas • desde {credit.startDate}</p>
              </div>
              <div className="credit-right">
                <p className="credit-value">{formatCurrency(credit.monthlyPayment)} / mes</p>
                <p className="credit-small">Restan {credit.remainingInstallments} cuotas</p>
                <p className="credit-small">Falta pagar {formatCurrency(credit.totalRemaining)}</p>
                <button type="button" className="ghost-button small danger" onClick={() => onDelete(credit.id)}>
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
