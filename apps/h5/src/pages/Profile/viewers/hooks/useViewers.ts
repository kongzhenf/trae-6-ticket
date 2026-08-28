import { useCallback, useEffect, useState } from 'react'
import type { Viewer, ViewerInput } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'
import { useUser } from '@/contexts/UserContext'

export interface UseViewersState {
  viewers: Viewer[]
  loading: boolean
  error: string | null
  /** 重新拉取 */
  refresh: () => Promise<void>
  /** 新增（C 端无需传 userId；admin 可传 userIdOverride） */
  create: (input: ViewerInput, userIdOverride?: string) => Promise<Viewer | null>
  /** 更新 */
  update: (id: string, input: Partial<ViewerInput>) => Promise<Viewer | null>
  /** 删除 */
  remove: (id: string) => Promise<boolean>
}

/**
 * 当前用户的观演人列表管理（H8）
 * - 维护 viewers / loading / error
 * - create / update / remove 写完后自动 refresh
 * - 失败抛错并返回 null/false
 */
export function useViewers(): UseViewersState {
  const { viewer: api } = useApi()
  const { user } = useUser()
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setViewers([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await api.listViewers(user.id)
      setViewers(list)
    } catch (e) {
      const er = e as { message?: string }
      setError(er?.message ?? '加载失败')
    } finally {
      setLoading(false)
    }
  }, [api, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (input: ViewerInput, userIdOverride?: string): Promise<Viewer | null> => {
      try {
        // admin 路径（userIdOverride 显式传入）：通过 listViewers 的 client 旁路
        if (userIdOverride && userIdOverride !== user?.id) {
          const client = api as unknown as {
            createViewer: (p: ViewerInput & { userId?: string }) => Promise<Viewer>
          }
          const created = await client.createViewer({ ...input, userId: userIdOverride })
          await refresh()
          return created
        }
        const created = await api.createViewer(input)
        await refresh()
        return created
      } catch (e) {
        const er = e as { response?: { data?: { message?: string } }; message?: string }
        setError(er?.response?.data?.message ?? er?.message ?? '新增失败')
        return null
      }
    },
    [api, refresh, user],
  )

  const update = useCallback(
    async (id: string, input: Partial<ViewerInput>): Promise<Viewer | null> => {
      try {
        const updated = await api.updateViewer(id, input)
        await refresh()
        return updated
      } catch (e) {
        const er = e as { response?: { data?: { message?: string } }; message?: string }
        setError(er?.response?.data?.message ?? er?.message ?? '保存失败')
        return null
      }
    },
    [api, refresh],
  )

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await api.deleteViewer(id)
        await refresh()
        return true
      } catch (e) {
        const er = e as { response?: { data?: { message?: string } }; message?: string }
        setError(er?.response?.data?.message ?? er?.message ?? '删除失败')
        return false
      }
    },
    [api, refresh],
  )

  return { viewers, loading, error, refresh, create, update, remove }
}
