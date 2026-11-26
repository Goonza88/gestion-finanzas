export function readStoredBudget(storage, key, createDefault, validate) {
  const fallback = () => createDefault()
  if (!storage) return { data: fallback(), status: 'unavailable' }

  let raw
  try {
    raw = storage.getItem(key)
  } catch (error) {
    console.error('Error leyendo los datos guardados:', error)
    return { data: fallback(), status: 'unavailable' }
  }

  if (raw === null) return { data: fallback(), status: 'empty' }

  try {
    const saved = JSON.parse(raw)
    if (!validate(saved)) return { data: fallback(), status: 'invalid' }
    return { data: { ...fallback(), ...saved, recurringRules: saved.recurringRules || [] }, status: 'valid' }
  } catch (error) {
    console.error('Error cargando datos:', error)
    return { data: fallback(), status: 'invalid' }
  }
}
