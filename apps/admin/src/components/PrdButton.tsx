import { cn } from '@/utils/cn'

export interface PrdButtonProps {
  isOpen: boolean
  onToggle: () => void
}

/**
 * 规范要求的 PRD 按钮。
 *
 * 使用 `position: fixed` 固定在视口右上角，确保在任何布局、滚动场景下都可见。
 */
export default function PrdButton({
  isOpen,
  onToggle,
  className,
}: PrdButtonProps & { className?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isOpen ? '关闭 PRD 面板' : '打开 PRD 面板'}
      data-prd-button="true"
      className={cn(
        'fixed top-20 right-6 z-40 flex items-center space-x-1.5 border px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm',
        isOpen
          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
          : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50',
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
      <span>PRD</span>
    </button>
  )
}
