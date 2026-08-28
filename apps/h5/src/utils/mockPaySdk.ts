import type { Order, PayMethod } from '@trae/shared'

export interface MockPayResult {
  success: true
  paidAt: string
  order: Order
}

export interface PayOrderInput {
  orderId: string
  method: PayMethod
  amount?: number
}

export type PayFn = (input: PayOrderInput) => Promise<MockPayResult>

/**
 * 模拟支付 SDK（H6 落地；真实微信/支付宝 SDK 由后续阶段替换）
 * - 通道耗时 1500ms 后调 `orderApi.pay(orderId)`
 * - mock 后端自动 幂等处理（已 paid 直接返回原订单）
 * - 失败抛错（含业务码）由调用方 Toast 展示
 */
export async function payOrder(
  input: PayOrderInput,
  orderApi: { pay: (id: string) => Promise<Order> },
): Promise<MockPayResult> {
  // 模拟通道耗时（PRD §D3）
  await new Promise<void>(resolve => setTimeout(resolve, 1500))
  const order = await orderApi.pay(input.orderId)
  return {
    success: true,
    paidAt: order.paidAt ?? new Date().toISOString().replace('T', ' ').slice(0, 19),
    order,
  }
}