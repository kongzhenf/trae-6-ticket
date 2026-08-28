import { Button } from 'react-vant'
import type { OrderActions as OA } from '../utils/orderStatus'

export interface ActionBarProps {
  actions: OA
  onPrimary: (kind: NonNullable<OA['primary']>['kind']) => void
  onSecondary: (kind: NonNullable<OA['secondary']>['kind']) => void
}

/**
 * 详情页底部操作条（与状态机映射表对齐）
 * - H5 暂只渲染按钮 + 触发回调；H6 实装 pay/cancel
 */
export default function ActionBar({ actions, onPrimary, onSecondary }: ActionBarProps) {
  return (
    <div
      data-testid="order-action-bar"
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        gap: 12,
        padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        background: '#fff',
        borderTop: '1px solid #f1f5f9',
        boxShadow: '0 -1px 6px rgba(15,23,42,0.04)',
        zIndex: 20,
      }}
    >
      {actions.secondary && (
        <Button
          plain
          type="primary"
          round
          onClick={() => onSecondary(actions.secondary!.kind)}
          style={{ flex: '0 0 120px', height: 40 }}
        >
          {actions.secondary.label}
        </Button>
      )}
      {actions.primary && (
        <Button
          type="primary"
          round
          disabled={actions.primary.kind === 'pay' && actions.payDisabled}
          onClick={() => onPrimary(actions.primary!.kind)}
          style={{ flex: 1, height: 40, fontWeight: 600 }}
        >
          {actions.primary.label}
        </Button>
      )}
    </div>
  )
}