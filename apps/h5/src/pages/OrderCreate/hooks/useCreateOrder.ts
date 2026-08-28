import { useCallback, useMemo, useState } from 'react'
import type { CreateOrderPayload } from '@trae/api'
import type { Order, TicketTier } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'

export interface UseCreateOrderState {
  submitting: boolean
  order: Order | null
  errorCode: number | null
  errorMessage: string | null
  submit: (payload: CreateOrderPayload) => Promise<Order | null>
  reset: () => void
}

interface AxiosLikeError {
  response?: { data?: { code?: number; message?: string } }
  message?: string
}

/**
 * 下单提交 hook（H8：payload 改为单档 + viewers[] + contactPhone）
 * - 维护 submitting / order / errorCode / errorMessage
 * - 不在此处处理导航，由上层 router 监听 `order` 变化决定跳详情
 * - 不进行表单校验——由 ContactForm / ViewersForm 校验并禁用按钮
 */
export function useCreateOrder(): UseCreateOrderState {
  const { order: api } = useApi()
  const [submitting, setSubmitting] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [errorCode, setErrorCode] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const submit = useCallback(
    async (payload: CreateOrderPayload): Promise<Order | null> => {
      setSubmitting(true)
      setErrorCode(null)
      setErrorMessage(null)
      try {
        const res = await api.createOrder(payload)
        setOrder(res)
        return res
      } catch (e) {
        const er = e as AxiosLikeError
        setErrorCode(er?.response?.data?.code ?? null)
        setErrorMessage(er?.response?.data?.message ?? er?.message ?? '提交失败')
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [api],
  )

  const reset = useCallback(() => {
    setOrder(null)
    setErrorCode(null)
    setErrorMessage(null)
  }, [])

  return useMemo(
    () => ({ submitting, order, errorCode, errorMessage, submit, reset }),
    [submitting, order, errorCode, errorMessage, submit, reset],
  )
}

/**
 * H8 工具：从 H3 跳转 query 解析单档
 * - 旧 query `items=tier1:2,tier2:1` 不再使用
 * - 新 query：`tier=<id>&qty=<n>`（单组）
 */
export interface ParsedSingleSelection {
  tierId: string | null
  quantity: number
}

export function parseSingleSelection(rawTier: string | null, rawQty: string | null): ParsedSingleSelection {
  const tierId = rawTier && rawTier.trim() ? rawTier.trim() : null
  const qty = Math.max(0, Math.floor(Number(rawQty) || 0))
  return { tierId, quantity: qty }
}

/** 单档合计 */
export function totalFromSingle(tier: TicketTier | undefined, quantity: number): { count: number; amount: number } {
  if (!tier || quantity <= 0) return { count: 0, amount: 0 }
  return { count: quantity, amount: quantity * tier.price }
}
