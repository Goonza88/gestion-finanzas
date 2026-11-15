import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentDateISO } from '../utils/date'

export default function Header({ theme, onToggleTheme, onExportBackup, onImportBackup }) {
  const backupFileRef = useRef(null)

  function handleExportBackup() {
    const blob = new Blob([onExportBackup()], { type: 'application/json' })
    const downloadUrl = URL.createObjectURL(blob)
    const downloadLink = document.createElement('a')
    downloadLink.href = downloadUrl
    downloadLink.download = `gestion-financiera-respaldo-${getCurrentDateISO()}.json`
    downloadLink.click()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
  }

  async function handleImportBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const contents = await file.text()
      if (!window.confirm('Importar este respaldo reemplazará los datos actuales. ¿Continuar?')) return
      onImportBackup(contents)
      window.alert('Respaldo importado correctamente.')
    } catch (error) {
      window.alert(error.message || 'No se pudo importar el respaldo.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <header className="header">
      <div className="header-inner">
        <h1>Gestión financiera</h1>
        <div className="header-actions">
          <Link className="ghost-button small" to="/repeticiones">Repeticiones</Link>
          <button className="ghost-button small" type="button" onClick={handleExportBackup}>
            Exportar respaldo
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
  )
}
