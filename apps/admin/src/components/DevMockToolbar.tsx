import { useState } from 'react'
import { App, Button } from 'antd'
import { ReloadOutlined, DatabaseOutlined } from '@ant-design/icons'
import { resetDB, dbStats } from '@trae/api'

/**
 * 仅在 import.meta.env.DEV 为 true 时挂载的浮动调试条。
 * 演示 / 调试用，不进入生产构建。
 */
export default function DevMockToolbar() {
  return import.meta.env.DEV ? <DevMockToolbarInner /> : null
}

function DevMockToolbarInner() {
  const { modal, message } = App.useApp()
  const [stats, setStats] = useState(() => dbStats())

  function refreshStats() {
    setStats(dbStats())
  }

  function handleReset() {
    modal.confirm({
      title: '重置 Mock 数据',
      content:
        '将清空 localStorage 中 concert_mock_db_v1 全部数据，恢复为初始 seed（30 场演出 / 56 票档 / 120 订单 / 50 用户）。页面会自动刷新。',
      okText: '确认重置',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk() {
        resetDB()
        message.success('Mock 数据已重置，页面即将刷新')
        setTimeout(() => window.location.reload(), 600)
      },
    })
  }

  return (
    <div
      data-dev-mock-toolbar
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 1100,
        padding: '8px 12px',
        background: 'rgba(15, 23, 42, 0.92)',
        color: '#e2e8f0',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        fontSize: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 240,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>
          <DatabaseOutlined style={{ marginRight: 4 }} />
          Mock 数据
        </span>
        <Button
          size="small"
          type="text"
          icon={<ReloadOutlined />}
          onClick={refreshStats}
          style={{ color: '#cbd5e1' }}
          title="刷新统计"
        />
      </div>
      <div style={{ lineHeight: 1.6, fontFamily: 'ui-monospace, monospace' }}>
        演出 <b>{stats.events}</b> · 票档 <b>{stats.tickets}</b>
        <br />
        订单 <b>{stats.orders}</b> · 用户 <b>{stats.users}</b>
        <br />
        调库记录 <b>{stats.adjustments}</b>
      </div>
      <Button
        size="small"
        danger
        block
        onClick={handleReset}
        icon={<ReloadOutlined spin={false} />}
      >
        重置 Mock 数据
      </Button>
    </div>
  )
}