import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/utils/cn'

export interface PrdSidePanelProps {
  /** 是否打开；为 true 时滑入 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 面板顶部标题 */
  title?: string
  /** markdown 文档内容；传 null/undefined 时显示占位 */
  markdown: string | null | undefined
}

export default function PrdSidePanel({
  open,
  onClose,
  title = 'PRD 文档',
  markdown,
}: PrdSidePanelProps) {
  const [mounted, setMounted] = useState(open)

  // 关闭时延迟卸载以保留滑出动画
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const timer = window.setTimeout(() => setMounted(false), 300)
    return () => window.clearTimeout(timer)
  }, [open])

  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!mounted) return null

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 pointer-events-none transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label={title}
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-[560px] max-w-[92vw] bg-white shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭 PRD 面板"
            className="flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-auto px-5 py-4 prd-markdown">
          {markdown ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-3 text-slate-300"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-sm">该页面 PRD 还未产出</p>
              <p className="text-xs text-slate-400 mt-1">后续需求补齐后会在此同步展示</p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
