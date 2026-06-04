import React from 'react'
export default function Header({ theme, onToggleTheme }) {
  const getAppWindow = async () => {
    try {
      const mod = await import('@tauri-apps/api/window')
      // try common exports
      return mod.appWindow ?? (mod.getCurrent ? mod.getCurrent() : mod.current ?? null)
    } catch (e) {
      return null
    }
  }

  return (
    <header className="header">
      <div className="header-inner">
        <h1>Gestión financiera</h1>
        <div>
          <button className="ghost-button theme-toggle" onClick={onToggleTheme}>
            {theme === 'dark' ? 'Claro' : 'Oscuro'}
          </button>
        </div>
      </div>
    </header>
  )
}
