import { useMemo } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Result,
  Skeleton,
  Space,
  Steps,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  RocketOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { ADMIN_ROUTES, canTransition, errorCodeMessage } from '@trae/shared'
import PrdPanelHost from '@/components/PrdPanelHost'
import EventStatusTag from '@/components/EventStatusTag'
import Step1Basic from './steps/Step1Basic'
import Step2Detail from './steps/Step2Detail'
import Step3SaleRule from './steps/Step3SaleRule'
import Step4BuyerFields from './steps/Step4BuyerFields'
import Step5Tickets from './steps/Step5Tickets'
import Step6Notice from './steps/Step6Notice'
import Step7Preview from './steps/Step7Preview'
import { useConcertEdit, sumTotalStock } from '@/hooks/useConcertEdit'

const { Title, Text } = Typography

const STEP_TITLES = [
  '基础信息',
  '活动详情',
  '销售规则',
  '购票字段',
  '票档配置',
  '购票须知',
  '发布预览',
]

/** 全量校验，返回错误键值对（k=字段，v=错误文案） */
function validateDraft(d: import('@/stores/concertDraftStore').ConcertDraft): Record<string, string> {
  const e: Record<string, string> = {}
  if (!d.eventName.trim()) e.eventName = '演出名称必填'
  if (!d.startTime) e.startTime = '开演时间必填'
  if (!d.venueName.trim()) e.venueName = '场馆名称必填'
  if (d.startTime && d.endTime && !dayjs(d.startTime).isBefore(d.endTime))
    e.endTime = '结束时间必须晚于开演时间'
  if (!d.saleStartTime) e.saleStartTime = '开售时间必填'
  if (!d.saleEndTime) e.saleEndTime = '停售时间必填'
  if (
    d.saleStartTime &&
    d.saleEndTime &&
    !dayjs(d.saleStartTime).isBefore(d.saleEndTime)
  )
    e.saleStartTime = '开售时间必须早于停售时间'
  if (
    d.saleEndTime &&
    d.startTime &&
    !dayjs(d.saleEndTime).isBefore(d.startTime)
  )
    e.saleEndTime = '停售时间必须早于开演时间'
  if (d.tickets.length === 0) e.tickets = '至少配置 1 个票档'
  if (sumTotalStock(d.tickets) <= 0) e.tickets = '总库存必须 > 0'
  if (!d.buyerNameRequired && !d.idCardRequired && !d.mobileRequired)
    e.buyerFields = '至少保留 1 个必填字段'
  return e
}

export default function ConcertEdit() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { message, modal } = App.useApp()

  const edit = useConcertEdit(id)

  const errors = useMemo(() => validateDraft(edit.draft), [edit.draft])

  if (edit.loading) {
    return (
      <PrdPanelHost pageKey="ConcertEdit">
        <div className="admin-content">
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      </PrdPanelHost>
    )
  }

  if (edit.error && !edit.server && id !== 'new') {
    return (
      <PrdPanelHost pageKey="ConcertEdit">
        <div className="admin-content">
          <Result
            status="error"
            title="加载失败"
            subTitle={edit.error}
            extra={
              <Space>
                <Button onClick={() => navigate(ADMIN_ROUTES.concertList)}>返回列表</Button>
              </Space>
            }
          />
        </div>
      </PrdPanelHost>
    )
  }

  const isNew = edit.scopeId === 'new'
  const headerTitle = isNew ? '新建演出' : `编辑演出 #${edit.scopeId}`

  function gotoNext() {
    const allErrors = validateDraft(edit.draft)
    const blockSteps: Record<number, string[]> = {
      0: ['eventName', 'startTime', 'venueName', 'endTime'],
      2: ['saleStartTime', 'saleEndTime'],
      3: ['buyerFields'],
      4: ['tickets'],
    }
    const blocking = blockSteps[edit.currentStep] ?? []
    const fail = blocking.some(k => allErrors[k])
    if (fail) {
      message.warning('请先完成本步骤必填字段')
      return
    }
    edit.next()
  }

  async function handleSave() {
    const r = await edit.save()
    if (r.ok) {
      message.success(r.message ?? '保存草稿成功')
      // 新建场景：保存成功后整页刷新到编辑模式 URL（让 useConcertEdit 重新加载新 scopeId 的 store + 服务端数据）
      if (isNew && r.id) {
        // 使用 replace + 刷新，避免 zustand store 因 scopeId 切换丢失 currentStep
        window.location.assign(ADMIN_ROUTES.concertEdit(r.id))
      }
    } else if (typeof r.code === 'number') {
      message.error(errorCodeMessage(r.code, r.message))
    } else {
      message.error(r.message ?? '保存失败')
    }
  }

  function handlePublish() {
    const allErrors = validateDraft(edit.draft)
    const keys = Object.keys(allErrors)
    if (keys.length > 0) {
      modal.error({
        title: '仍有必填字段未完成',
        content: (
          <div>
            <p>请检查以下字段后重试：</p>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {keys.map(k => (
                <li key={k} style={{ color: '#dc2626' }}>
                  {allErrors[k]}
                </li>
              ))}
            </ul>
          </div>
        ),
      })
      return
    }
    if (edit.serverStatus && !canTransition(edit.serverStatus, 'published')) {
      message.error('当前状态不可发布（非法状态转移）')
      return
    }
    modal.confirm({
      title: '确认发布？',
      content: (
        <span>
          发布后状态将变为「已发布」，可在「演出管理」列表继续操作「开始售票」进入售票阶段。
        </span>
      ),
      okText: '确认发布',
      cancelText: '取消',
      onOk: async () => {
        const r = await edit.publish()
        if (r.ok) {
          message.success(r.message ?? '发布成功')
          navigate(ADMIN_ROUTES.concertList)
        } else if (typeof r.code === 'number') {
          message.error(errorCodeMessage(r.code, r.message))
        } else {
          message.error(r.message ?? '发布失败')
        }
      },
    })
  }

  function renderStep() {
    switch (edit.currentStep) {
      case 0:
        return (
          <Step1Basic
            draft={edit.draft}
            patch={edit.patch}
            errors={edit.currentStep === 0 ? errors : undefined}
          />
        )
      case 1:
        return <Step2Detail draft={edit.draft} patch={edit.patch} />
      case 2:
        return (
          <Step3SaleRule
            draft={edit.draft}
            patch={edit.patch}
            errors={edit.currentStep === 2 ? errors : undefined}
          />
        )
      case 3:
        return (
          <Step4BuyerFields
            draft={edit.draft}
            patch={edit.patch}
            errors={edit.currentStep === 3 ? errors : undefined}
          />
        )
      case 4:
        return (
          <Step5Tickets
            draft={edit.draft}
            setTickets={edit.setTickets}
            errors={edit.currentStep === 4 ? errors : undefined}
          />
        )
      case 5:
        return <Step6Notice draft={edit.draft} patch={edit.patch} />
      case 6:
        return (
          <Step7Preview
            draft={edit.draft}
            buyerFields={{
              name: edit.draft.buyerNameRequired,
              idCard: edit.draft.idCardRequired,
              mobile: true,
            }}
          />
        )
      default:
        return <Empty />
    }
  }

  return (
    <PrdPanelHost pageKey="ConcertEdit">
      <div className="admin-content">
        {/* 顶部条 */}
        <div className="flex items-center justify-between mb-4">
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(ADMIN_ROUTES.concertList)}
            >
              返回列表
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              {headerTitle}
            </Title>
            {edit.serverStatus && <EventStatusTag status={edit.serverStatus} />}
            {edit.dirty && (
              <Text type="warning" style={{ fontSize: 12 }}>
                ● 有未保存改动
              </Text>
            )}
          </Space>
          <Space>
            <Button
              icon={<SaveOutlined />}
              loading={edit.saving}
              onClick={handleSave}
            >
              保存草稿
            </Button>
            <Button
              type="primary"
              icon={<RocketOutlined />}
              loading={edit.publishing}
              onClick={handlePublish}
            >
              发布
            </Button>
          </Space>
        </div>

        {edit.serverStatus &&
          !canTransition(edit.serverStatus, 'published') && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={`当前状态「${edit.serverStatus}」无法发布`}
              description="可在「演出管理」列表对状态机白名单内的状态切换后再发布，或继续编辑保存草稿。"
            />
          )}

        {/* Step 容器 */}
        <Card variant="outlined">
          <Steps
            current={edit.currentStep}
            items={STEP_TITLES.map((t, i) => ({
              title: t,
              content: i === 6 ? '保存 / 发布' : undefined,
            }))}
            onChange={(s: number) => edit.goto(s)}
            style={{ marginBottom: 24 }}
          />

          <div style={{ minHeight: 320 }}>{renderStep()}</div>

          <div
            className="flex items-center justify-between"
            style={{ marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}
          >
            <Button
              disabled={edit.currentStep === 0}
              onClick={edit.prev}
            >
              上一步
            </Button>
            <Space>
              <Button
                icon={<CloudUploadOutlined />}
                loading={edit.saving}
                onClick={handleSave}
              >
                保存草稿
              </Button>
              {edit.currentStep < STEP_TITLES.length - 1 ? (
                <Button type="primary" onClick={gotoNext}>
                  下一步
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={edit.publishing}
                  onClick={handlePublish}
                >
                  确认发布
                </Button>
              )}
            </Space>
          </div>
        </Card>
      </div>
    </PrdPanelHost>
  )
}
