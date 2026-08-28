import { App as AntdApp, Space, Typography } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import PrdPanelHost from '@/components/PrdPanelHost'
import CreateExportCard from './components/CreateExportCard'
import TaskListTable from './components/TaskListTable'
import { useExportTaskList } from './hooks/useExportTaskList'

const { Title } = Typography

/**
 * 导出中心 H10 B10
 * - 顶部：创建导出卡片
 * - 主体：导出任务列表（processing 时自动 1.5s 轮询）
 */
export default function ExportCenter() {
  const { message } = AntdApp.useApp()
  const { list, total, loading, query, setQuery, refresh } = useExportTaskList()

  function onCreated() {
    message.success('已创建导出任务，预计 2-3 秒完成')
    void refresh()
  }

  function onTableChange(p: TablePaginationConfig) {
    setQuery({
      ...query,
      page: p.current ?? query.page ?? 1,
      pageSize: p.pageSize ?? query.pageSize ?? 20,
    })
  }

  return (
    <PrdPanelHost pageKey="ExportCenter">
      <div className="admin-content" data-testid="export-center-root">
        <Title level={3}>导出中心</Title>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <CreateExportCard onCreated={onCreated} />
          <TaskListTable
            data={list}
            loading={loading}
            total={total}
            page={query.page ?? 1}
            pageSize={query.pageSize ?? 20}
            onChange={onTableChange}
            onRefresh={() => void refresh()}
          />
        </Space>
      </div>
    </PrdPanelHost>
  )
}
