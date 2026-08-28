import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/** 单个票档的草稿形态（M4 阶段）
 * - 价是元（用户输入），上传时 *100 转分（mock handler 默认信任后端重算）
 * - saleStart/saleEnd 与活动销售期不一致的兜底：保存时按活动 saleStart/saleEnd 收紧
 */
export interface DraftTicketItem {
  /** 临时 key（仅前端用），保存前会丢弃 */
  key: string
  categoryName: string
  /** 元 */
  price: number
  totalStock: number
  maxBuyQuantity: number
  saleStartTime: string
  saleEndTime: string
  sort: number
  description?: string
}

/** 完整草稿形态（7 步合并） */
export interface ConcertDraft {
  eventName: string
  subtitle: string
  coverUrl: string
  bannerUrl: string
  startTime: string
  endTime: string
  venueName: string
  venueAddress: string
  longitude?: number
  latitude?: number

  detailContent: string

  saleStartTime: string
  saleEndTime: string
  orderTimeoutMinutes: number
  maxBuyQuantity: number
  refundEnabled: boolean
  showStock: boolean

  buyerNameRequired: boolean
  idCardRequired: boolean
  /** mobileRequired 始终 true，PRD §5 规定不可关 */
  mobileRequired: true

  tickets: DraftTicketItem[]

  noticeContent: string
}

export const DEFAULT_DRAFT: ConcertDraft = {
  eventName: '',
  subtitle: '',
  coverUrl: '',
  bannerUrl: '',
  startTime: '',
  endTime: '',
  venueName: '',
  venueAddress: '',
  longitude: undefined,
  latitude: undefined,

  detailContent: '',

  saleStartTime: '',
  saleEndTime: '',
  orderTimeoutMinutes: 15,
  maxBuyQuantity: 4,
  refundEnabled: true,
  showStock: true,

  buyerNameRequired: true,
  idCardRequired: true,
  mobileRequired: true,

  tickets: [],

  noticeContent: '',
}

interface DraftStoreState {
  /** 该演出在 DB 中的 id；新建时为 'new' */
  scopeId: string | null
  draft: ConcertDraft
  /** 是否有未保存改动 */
  dirty: boolean
  /** 当前激活的 step（0-6） */
  currentStep: number
  setScope: (id: string | null) => void
  patch: (next: Partial<ConcertDraft>) => void
  setTickets: (items: DraftTicketItem[]) => void
  setStep: (s: number) => void
  markClean: () => void
  reset: () => void
}

/** 生成唯一 draftId（避免与已有 id 冲突的临时 key） */
function draftKey(scopeId: string | null): string {
  return scopeId ? `concert_draft_${scopeId}` : 'concert_draft_new'
}

/** 按 scope 隔离的 store factory */
function buildStore(scopeIdInit: string | null) {
  return create<DraftStoreState>()(
    persist(
      set => ({
        scopeId: scopeIdInit,
        draft: { ...DEFAULT_DRAFT },
        dirty: false,
        currentStep: 0,
        setScope: id => set({ scopeId: id }),
        patch: next =>
          set(state => ({
            draft: { ...state.draft, ...next },
            dirty: true,
          })),
        setTickets: items =>
          set(state => ({ draft: { ...state.draft, tickets: items }, dirty: true })),
        setStep: s => set({ currentStep: s }),
        markClean: () => set({ dirty: false }),
        reset: () => set({ draft: { ...DEFAULT_DRAFT }, dirty: false, currentStep: 0 }),
      }),
      {
        name: draftKey(scopeIdInit),
        storage: createJSONStorage(() => localStorage),
        // 只持久化 draft / dirty / currentStep；scopeId 是 store factory 的入参
        partialize: s => ({
          draft: s.draft,
          dirty: s.dirty,
          currentStep: s.currentStep,
        }),
      },
    ),
  )
}

/** 不同 scopeId 对应不同 store 实例。
 * 这里用 Map 缓存，每个 id 一个独立 hook 实例。 */
type StoreApi = ReturnType<typeof buildStore>
const cache = new Map<string, StoreApi>()

export function getDraftStore(scopeId: string | null): StoreApi {
  const key = scopeId ?? 'new'
  if (!cache.has(key)) cache.set(key, buildStore(scopeId))
  return cache.get(key)!
}
