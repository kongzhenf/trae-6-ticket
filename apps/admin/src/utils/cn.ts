import { clsx, type ClassValue } from 'clsx'

/** Tailwind className 合并工具（基于 clsx；后续若需 tailwind-merge 可替换） */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
