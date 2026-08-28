import { useEffect, useState } from 'react'
import { useApi } from '@/contexts/ApiContext'

/**
 * 当前用户的观演人数量（H8）
 * - 数量用于 Profile 卡片展示「共 N 位」
 * - Profile 重新进入或 user.id 变化时重新拉取
 */
export function useViewerCount(userId: string | undefined): number {
  const { viewer: api } = useApi()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!userId) {
      setCount(0)
      return
    }
    let cancelled = false
    api.listViewers(userId)
      .then(list => { if (!cancelled) setCount(list.length) })
      .catch(() => { if (!cancelled) setCount(0) })
    return () => { cancelled = true }
  }, [api, userId])

  return count
}
