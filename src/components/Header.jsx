import { useRef, useState } from 'react'
import { getCurrentDateISO } from '../utils/date'
import BackupManager from './BackupManager'
import ConfirmationDialog from './ConfirmationDialog'

export default function Header({ theme, onToggleTheme, onExportBackup, onImportBackup }) {
  const backupFileRef = useRef(null)
  const [backupManagerOpen, setBackupManagerOpen] = useState(false)
  const [exportConfirmationOpen, setExportConfirmationOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState(null)

  function handleExportBackup() {
    let downloadUrl
    let downloadLink
    try {
      const blob = new Blob([onExportBackup()], { type: 'application/json' })
      downloadUrl = URL.createObjectURL(blob)
      downloadLink = document.createElement('a')
      downloadLink.href = downloadUrl
      downloadLink.download = `gestion-financiera-respaldo-${getCurrentDateISO()}.json`
      downloadLink.style.display = 'none'
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
    } catch (error) {
      downloadLink?.remove()
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
      window.alert(error.message || 'No se pudo exportar el respaldo.')
    }
  }

  async function handleImportBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const contents = await file.text()
      setPendingImport(contents)
    } catch (error) {
      window.alert(error.message || 'No se pudo importar el respaldo.')
    } finally {
      event.target.value = ''
    }
  }

  async function confirmImportBackup() {
    try {
      await onImportBackup(pendingImport)
      window.alert('Respaldo importado correctamente.')
    } catch (error) {
      window.alert(error.message || 'No se pudo importar el respaldo.')
    } finally {
      setPendingImport(null)
    }
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <h1>Gestión Financiera</h1>
          <div className="header-actions">
            <button className="ghost-button small" type="button" onClick={() => setExportConfirmationOpen(true)}>
              Exportar respaldo
            </button>
            <button className="ghost-button small" type="button" onClick={() => setBackupManagerOpen(true)}>
              Copias locales
            </button>
            <button className="ghost-button small" type="button" onClick={() => backupFileRef.current?.click()}>
              Importar respaldo
            </button>
            <input
              ref={backupFileRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportBackup}
              hidden
            />
            <button className="ghost-button theme-toggle" onClick={onToggleTheme}>
              {theme === 'dark' ? 'Claro' : 'Oscuro'}
            </button>
          </div>
        </div>
      </header>
      <BackupManager open={backupManagerOpen} onClose={() => setBackupManagerOpen(false)} onRestore={onImportBackup} />
      {exportConfirmationOpen && (
        <ConfirmationDialog
          title="Exportar respaldo"
          description="Se descargará un archivo con una copia de tus datos actuales. ¿Querés continuar?"
          onCancel={() => setExportConfirmationOpen(false)}
          actions={[
            { label: 'Cancelar', onClick: () => setExportConfirmationOpen(false) },
            { label: 'Exportar respaldo', variant: 'primary', onClick: () => {
              setExportConfirmationOpen(false)
              handleExportBackup()
            } },
          ]}
        />
      )}
      {pendingImport !== null && (
        <ConfirmationDialog
          title="Importar respaldo"
          description="Este respaldo reemplazará los datos actuales. ¿Querés continuar?"
          onCancel={() => setPendingImport(null)}
          actions={[
            { label: 'Cancelar', onClick: () => setPendingImport(null) },
            { label: 'Importar respaldo', variant: 'danger', onClick: confirmImportBackup },
          ]}
        />
      )}
    </>
  )
}
