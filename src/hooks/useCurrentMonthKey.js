import { useEffect, useState } from 'react'
import { getCurrentMonthKey } from '../utils/date'

export default function useCurrentMonthKey() {
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey)

  useEffect(() => {
    function refreshMonthKey() {
      const currentMonthKey = getCurrentMonthKey()
      setMonthKey((previousMonthKey) => (
        previousMonthKey === currentMonthKey ? previousMonthKey : currentMonthKey
      ))
    }

    const intervalId = window.setInterval(refreshMonthKey, 60_000)
    window.addEventListener('focus', refreshMonthKey)
    document.addEventListener('visibilitychange', refreshMonthKey)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshMonthKey)
      document.removeEventListener('visibilitychange', refreshMonthKey)
    }
  }, [])

  return monthKey
}
