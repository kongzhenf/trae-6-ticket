import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ViewerInput } from '@trae/shared'

/**
 * H8 起：
 * - 删除 BuyerDraft（实名三件套），改为 ContactDraft（仅联系手机号）
 * - 增加 viewersDraft（按数量，每张票对应一个观演人）
 * - persist 命名空间改为 `concert_contact_draft_v1`（旧 `concert_buyer_draft_v1` 自动丢弃）
 * - version: 2 触发旧结构迁移忽略
 */
export interface ContactDraft {
  /** 联系手机号（订单通知用） */
  contactPhone: string
}

export interface ContactDraftState {
  draft: ContactDraft
  viewers: ViewerInput[]
  setDraft: (next: Partial<ContactDraft>) => void
  /** 设置第 i 张票对应的观演人 */
  setViewer: (index: number, next: Partial<ViewerInput>) => void
  /** 重置所有观演人（数量变化时调用） */
  setViewers: (next: ViewerInput[]) => void
  /** 清空观演人（重置 selectedViewerId 等） */
  clearViewers: () => void
  clear: () => void
}

const EMPTY_DRAFT: ContactDraft = { contactPhone: '' }
const EMPTY_VIEWER: ViewerInput = { name: '', idCardCipher: '', phone: '' }

/**
 * 联系信息 + 观演人草稿 store（H8 改造）
 * - 持久化到 `concert_contact_draft_v1`（version=2）
 * - 旧 key `concert_buyer_draft_v1` 自动丢弃（兼容方案：version bump）
 * - 不按 userId 命名空间：H7 后 user.phone 在登录时由 useUser 同步传入
 */
export const useContactDraftStore = create<ContactDraftState>()(
  persist(
    set => ({
      draft: EMPTY_DRAFT,
      viewers: [],
      setDraft: next =>
        set(prev => ({ draft: { ...prev.draft, ...next } })),
      setViewer: (index, next) =>
        set(prev => {
          const arr = prev.viewers.slice()
          while (arr.length <= index) arr.push({ ...EMPTY_VIEWER })
          arr[index] = { ...arr[index], ...next }
          return { viewers: arr }
        }),
      setViewers: next => set({ viewers: next }),
      clearViewers: () => set({ viewers: [] }),
      clear: () => set({ draft: EMPTY_DRAFT, viewers: [] }),
    }),
    {
      name: 'concert_contact_draft_v1',
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
)

/** 兼容旧引用：保留 BuyerDraft 别名以避免 import 报错（不推荐新代码使用） */
export type { ViewerInput }

/** 兼容旧 store name 的引用（H8 前代码可能 import） */
export { useContactDraftStore as useBuyerDraftStore }
