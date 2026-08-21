import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'

const STORAGE_KEY = 'peoplebind-sidebar-collapsed'

export function useSidebarCollapse(): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  return [collapsed, setCollapsed]
}
