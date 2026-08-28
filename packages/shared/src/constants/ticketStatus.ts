import type { TicketTierStatus } from '../types/ticket'

export const TICKET_STATUS: Record<TicketTierStatus, { label: string; color: string }> = {
  available: { label: '在售', color: 'green' },
  sold_out:  { label: '售罄', color: 'gray'  },
  hidden:    { label: '隐藏', color: 'default' },
  stopped:   { label: '停售', color: 'orange' },
}

/** 票档状态转移白名单 */
export const TICKET_TRANSITIONS: Record<TicketTierStatus, TicketTierStatus[]> = {
  available: ['sold_out', 'hidden', 'stopped'],
  sold_out:  ['available', 'stopped'],
  hidden:    ['available'],
  stopped:   ['available', 'sold_out'],
}

export function canTicketTransition(from: TicketTierStatus, to: TicketTierStatus): boolean {
  return TICKET_TRANSITIONS[from]?.includes(to) ?? false
}