import { formatCurrency, formatDate } from '../utils/format'

export default function TransactionTable({ transactions, onDelete, onEdit }) {
  const ordered = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
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
                    <button type="button" className="ghost-button small danger" onClick={() => {
                      if (window.confirm(`¿Eliminar "${tx.description}" por ${formatCurrency(tx.amount)}?`)) onDelete(tx.id)
                    }}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
