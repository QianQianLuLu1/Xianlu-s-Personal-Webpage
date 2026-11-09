import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    // 详情页整页渲染（如 FlashGaze 的 CV 维度表）在并行负载下可能超过默认 5s，
    // 放宽到 15s 消除偶发超时抖动，仅影响容差、不影响断言语义
    testTimeout: 15000,
  },
});
