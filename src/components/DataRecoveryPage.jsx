import { useRef, useState } from 'react'
import BackupManager from './BackupManager'

export default function DataRecoveryPage({ onImportBackup }) {
  const fileInputRef = useRef(null)
  const [backupManagerOpen, setBackupManagerOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleBackupFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    try {
      await onImportBackup(await file.text())
    } catch (reason) {
      setError(reason?.message || 'No se pudo restaurar el archivo. Elegí un respaldo válido.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <main className="data-recovery-page">
      <section className="data-recovery-card" aria-labelledby="data-recovery-title">
        <p className="eyebrow">Protección de datos</p>
        <h1 id="data-recovery-title">No pudimos leer los datos guardados</h1>
        <p>
          Pausamos los cambios para evitar guardar un estado vacío encima de tus datos.
          Para continuar, restaurá un respaldo válido.
        </p>
        {error && <p className="backup-error" role="alert">{error}</p>}
        <div className="data-recovery-actions">
          <button type="button" className="primary" onClick={() => fileInputRef.current?.click()}>
            Importar respaldo JSON
          </button>
          <button type="button" className="ghost-button" onClick={() => setBackupManagerOpen(true)}>
            Buscar copias locales
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleBackupFile}
          hidden
        />
      </section>
      <BackupManager
        open={backupManagerOpen}
        onClose={() => setBackupManagerOpen(false)}
        onRestore={onImportBackup}
      />
    </main>
  )
}
