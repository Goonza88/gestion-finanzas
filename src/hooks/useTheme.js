import { useEffect, useState } from 'react'

const STORAGE_KEY = 'gestion_financiera_tema'

function loadTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch (error) {
    console.error('Error cargando tema:', error)
    return 'light'
  }
}

function saveTheme(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch (error) {
    console.error('Error guardando tema:', error)
  }
}

export default function useTheme() {
  const [theme, setTheme] = useState(() => loadTheme())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    saveTheme(theme)
  }, [theme])

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme }
}
