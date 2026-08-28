import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/**
 * Admin SPA 配置
 * - 本地 dev：base = '/'（http://localhost:5174/dashboard）
 * - Vercel 部署：base = '/admin/'（产物里 <script src="/admin/assets/...">）
 *   通过环境变量 VITE_PUBLIC_BASE 控制；build-vercel.sh 会传入
 */
const base = process.env.VITE_PUBLIC_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@trae/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@trae/api': path.resolve(__dirname, '../../packages/api/src'),
    },
  },
  server: {
    port: 5174,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
})
