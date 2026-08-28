import { Col, DatePicker, Form, Input, InputNumber, Row, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect } from 'react'
import type { ConcertDraft } from '@/stores/concertDraftStore'

const { Text } = Typography

export interface Step1BasicProps {
  draft: ConcertDraft
  patch: (next: Partial<ConcertDraft>) => void
  errors?: Record<string, string>
}

export default function Step1Basic({ draft, patch, errors = {} }: Step1BasicProps) {
  // Dayjs -> string / string -> Dayjs
  const start: Dayjs | null = draft.startTime ? dayjs(draft.startTime) : null
  const end: Dayjs | null = draft.endTime ? dayjs(draft.endTime) : null

  // 校验 startTime < endTime
  useEffect(() => {
    if (start && end && !start.isBefore(end)) {
      // 不在这里抛错，仅在父组件 errors 中标注
    }
  }, [start, end])

  function setStart(v: Dayjs | null) {
    patch({ startTime: v ? v.toISOString() : '' })
  }
  function setEnd(v: Dayjs | null) {
    patch({ endTime: v ? v.toISOString() : '' })
  }

  return (
    <Form layout="vertical" component="div">
      <Form.Item
        label="演出名称"
        required
        validateStatus={errors.eventName ? 'error' : undefined}
        help={errors.eventName}
      >
        <Input
          placeholder="如：周杰伦 2026 巡回演唱会"
          maxLength={200}
          showCount
          value={draft.eventName}
          onChange={e => patch({ eventName: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="副标题">
        <Input
          placeholder="如：上海站 / 首场 / 限时"
          maxLength={300}
          value={draft.subtitle}
          onChange={e => patch({ subtitle: e.target.value })}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="封面 URL">
            <Input
              placeholder="https://...（后续接入文件上传）"
              value={draft.coverUrl}
              onChange={e => patch({ coverUrl: e.target.value })}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Banner URL">
            <Input
              placeholder="https://..."
              value={draft.bannerUrl}
              onChange={e => patch({ bannerUrl: e.target.value })}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="开演时间"
            required
            validateStatus={errors.startTime ? 'error' : undefined}
            help={errors.startTime}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              value={start}
              onChange={setStart}
              placeholder="选择开演时间"
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="结束时间"
            help={end && start && !start.isBefore(end) ? '结束时间必须晚于开演时间' : undefined}
            validateStatus={end && start && !start.isBefore(end) ? 'error' : undefined}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              value={end}
              onChange={setEnd}
              placeholder="可空，默认 +3 小时"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="场馆名称"
            required
            validateStatus={errors.venueName ? 'error' : undefined}
            help={errors.venueName}
          >
            <Input
              placeholder="如：上海体育馆"
              maxLength={200}
              value={draft.venueName}
              onChange={e => patch({ venueName: e.target.value })}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="场馆地址">
            <Input
              placeholder="详细地址（选填）"
              maxLength={500}
              value={draft.venueAddress}
              onChange={e => patch({ venueAddress: e.target.value })}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="经度">
            <InputNumber
              style={{ width: '100%' }}
              placeholder="可选，范围 -180 ~ 180"
              min={-180}
              max={180}
              step={0.000001}
              value={draft.longitude}
              onChange={v => patch({ longitude: v ?? undefined })}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="纬度">
            <InputNumber
              style={{ width: '100%' }}
              placeholder="可选，范围 -90 ~ 90"
              min={-90}
              max={90}
              step={0.000001}
              value={draft.latitude}
              onChange={v => patch({ latitude: v ?? undefined })}
            />
          </Form.Item>
        </Col>
      </Row>

      <Text type="secondary" style={{ fontSize: 12 }}>
        TODO（M4 范围外）：封面 / Banner 支持本地上传；场馆支持地图选址
      </Text>
    </Form>
  )
}
