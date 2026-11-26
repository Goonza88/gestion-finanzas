import { useState } from 'react'
import { formatCurrency, formatDate } from '../utils/format'
import ConfirmationDialog from './ConfirmationDialog'

export default function TransactionTable({ transactions, onDelete, onEdit }) {
  const [pendingDelete, setPendingDelete] = useState(null)
  const ordered = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <>
      <div className="transaction-table-card">
        <div className="table-header">
          <h3>Movimientos</h3>
          <span>{ordered.length} registros</span>
        </div>
        {ordered.length === 0 ? (
          <p className="empty-state">Aún no hay movimientos para este mes.</p>
        ) : (
          <table className="transaction-table">
            <thead>
              <tr>
                <th className="tfec">Fecha</th>
                <th className="tdes">Descripción</th>
                <th className="tmon">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((tx) => (
                <tr key={tx.id}>
                  <td>{formatDate(tx.date)}</td>
                  <td>{tx.description}</td>
                  <td className={tx.type === 'income' ? 'positive' : 'negative'}>
                    {tx.type === 'expense' ? '-' : '+'} {formatCurrency(tx.amount)}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button type="button" className="ghost-button small" onClick={() => onEdit(tx)}>
                        Editar
                      </button>
                        <button type="button" className="ghost-button small danger" onClick={() => setPendingDelete(tx)}>
                          {tx.isCreditInstallment ? 'Omitir cuota' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {pendingDelete && (
        <ConfirmationDialog
          title={pendingDelete.isCreditInstallment ? 'Omitir cuota' : 'Eliminar movimiento'}
          description={pendingDelete.isCreditInstallment
            ? `¿Omitir “${pendingDelete.description}” por ${formatCurrency(pendingDelete.amount)}? No volverá a generarse.`
            : `¿Eliminar “${pendingDelete.description}” por ${formatCurrency(pendingDelete.amount)}?`}
          onCancel={() => setPendingDelete(null)}
          actions={[
            { label: 'Cancelar', onClick: () => setPendingDelete(null) },
            { label: pendingDelete.isCreditInstallment ? 'Omitir cuota' : 'Eliminar movimiento', variant: 'danger', onClick: () => {
              onDelete(pendingDelete.id)
              setPendingDelete(null)
            } },
          ]}
        />
      )}
    </>
  )
}
