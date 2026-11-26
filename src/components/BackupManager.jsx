import { useEffect, useState } from 'react'
import { invoke, isTauri } from '@tauri-apps/api/core'
import ConfirmationDialog from './ConfirmationDialog'

export default function BackupManager({ open, onClose, onRestore }) {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(false)
  const [restoringName, setRestoringName] = useState('')
  const [error, setError] = useState('')
  const [backupPendingRestore, setBackupPendingRestore] = useState(null)
  const unavailableMessage = open && !isTauri()
    ? 'Las copias locales están disponibles en la versión instalada de escritorio.'
    : ''

  useEffect(() => {
    if (!open) return undefined
    if (!isTauri()) return undefined

    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined
        setLoading(true)
        setError('')
        return invoke('list_local_backups')
      })
      .then((items) => {
        if (!cancelled && items) setBackups(items)
      })
      .catch((reason) => {
        if (!cancelled) setError(reason?.toString() || 'No se pudieron cargar las copias locales.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [open])

  async function confirmRestoreBackup() {
    const backup = backupPendingRestore
    setBackupPendingRestore(null)
    if (!backup) return
    setRestoringName(backup.name)
    setError('')
    try {
      const contents = await invoke('read_local_backup', { name: backup.name })
      await onRestore(contents)
      window.alert('Copia restaurada correctamente.')
      onClose()
    } catch (reason) {
      setError(reason?.message || reason?.toString() || 'No se pudo restaurar la copia.')
    } finally {
      setRestoringName('')
    }
  }

  if (!open) return null

  return (
    <>
      <div className="modal-backdrop" role="presentation">
        <section className="backup-modal" role="dialog" aria-modal="true" aria-labelledby="backup-modal-title">
          <header className="backup-modal-header">
            <div>
              <p className="eyebrow">Seguridad de los datos</p>
              <h2 id="backup-modal-title">Copias locales</h2>
            </div>
            <button type="button" className="ghost-button small" onClick={onClose}>Cerrar</button>
          </header>
          {loading && <p className="empty-state">Buscando copias…</p>}
          {(unavailableMessage || error) && <p className="backup-error" role="alert">{unavailableMessage || error}</p>}
          {!loading && !unavailableMessage && !error && backups.length === 0 && <p className="empty-state">No hay copias locales disponibles.</p>}
          {backups.length > 0 && (
            <div className="backup-list">
              {backups.map((backup) => (
                <article key={backup.name} className="backup-row">
                  <div>
                    <strong>{new Date(backup.modifiedAt).toLocaleString('es-AR')}</strong>
                    <p className="small-text">{backup.name}</p>
                  </div>
                  <button
                    type="button"
                    className="ghost-button small"
                    disabled={Boolean(restoringName)}
                    onClick={() => setBackupPendingRestore(backup)}
                  >
                    {restoringName === backup.name ? 'Restaurando…' : 'Restaurar'}
                  </button>
                </article>
              ))}
            </div>
          )}
          <p className="backup-note">Se conservan hasta 30 copias locales en este equipo.</p>
        </section>
      </div>
      {backupPendingRestore && (
        <ConfirmationDialog
          title="Restaurar copia local"
          description={`La copia del ${new Date(backupPendingRestore.modifiedAt).toLocaleString('es-AR')} reemplazará los datos actuales.`}
          dialogClassName="wide-dialog"
          backdropClassName="elevated"
          onCancel={() => setBackupPendingRestore(null)}
          actions={[
            { label: 'Cancelar', onClick: () => setBackupPendingRestore(null) },
            { label: 'Restaurar copia', variant: 'danger', onClick: confirmRestoreBackup },
          ]}
        />
      )}
    </>
  )
}
