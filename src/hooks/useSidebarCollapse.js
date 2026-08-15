import { useState, useEffect } from 'react'

const STORAGE_KEY = 'peoplebind-sidebar-collapsed'

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  return [collapsed, setCollapsed]
}
