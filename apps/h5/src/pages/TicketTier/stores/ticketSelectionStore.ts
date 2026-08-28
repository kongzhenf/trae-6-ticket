import { create } from 'zustand'

/**
 * H8 起：单票档单选（一个订单只允许一个票档，支持多张）
 * - 数据结构改为 `{ tierId: string | null; qty: number }`
 * - 切换 tier 时旧 tier 自动归零（在 setSelection 中实现）
 */
export interface TicketSelectionState {
  /** 当前演出 ID（用于校验跨页跳转一致性） */
  concertId: string | null
  /** 当前选中的票档 ID；null 表示未选 */
  tierId: string | null
  /** 当前票档数量（>=1） */
  qty: number
  /** 进入页面时调用，绑定 concertId；切换演出时 clear */
  enter: (concertId: string) => void
  /**
   * 设置选中票档与数量
   * - 切换到另一 tier 时旧 tier 自动归零（外部无需关心）
   * - qty = 0 表示清空（tierId 也置 null）
   */
  setSelection: (tierId: string | null, qty: number) => void
  /** 清空全部（离开 H3 或下单成功后） */
  clear: () => void
}

/**
 * H3 票档选择 store（H8 改：单选）
 * - 不持久化
 * - tierId/qty 与具体票档解耦，价格/库存元数据由 hook 单独维护
 */
export const useTicketSelectionStore = create<TicketSelectionState>(set => ({
  concertId: null,
  tierId: null,
  qty: 0,
  enter: (concertId) =>
    set(prev => (prev.concertId === concertId ? prev : { concertId, tierId: null, qty: 0 })),
  setSelection: (tierId, qty) =>
    set(() => ({
      tierId: qty > 0 ? tierId : null,
      qty: qty > 0 ? qty : 0,
    })),
  clear: () => set({ concertId: null, tierId: null, qty: 0 }),
}))

/** 工具：把 selection 转为跳转 query（H8 改为 tier + qty 单组） */
export function selectionToQuery(state: { tierId: string | null; qty: number }): string {
  if (!state.tierId || state.qty <= 0) return ''
  return `${state.tierId}:${state.qty}`
}
