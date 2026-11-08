import { useEffect, useState } from 'react'

export default function useStoredNumber(key, fallback) {
  const [value, setValue] = useState(() => {
    const raw = Number(localStorage.getItem(key))
    return Number.isFinite(raw) && raw > 0 ? raw : fallback
  })
  useEffect(() => {
    localStorage.setItem(key, String(value))
  }, [key, value])
  return [value, setValue]
}

export function useStoredFlag(key, fallback) {
  const [value, setValue] = useState(() => {
    const raw = localStorage.getItem(key)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return fallback
  })
  useEffect(() => {
    localStorage.setItem(key, String(value))
  }, [key, value])
  return [value, setValue]
}
