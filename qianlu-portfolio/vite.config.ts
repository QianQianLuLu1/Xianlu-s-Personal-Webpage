import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * SPA 路由回退：构建后把 index.html 复制为 404.html。
 * GitHub Pages 对未知路径会改用 404.html 响应，内容与首页一致时
 * BrowserRouter 即可接管 /projects/* 的直达与刷新（SPA 回退）。
 */
function spaFallback404(): Plugin {
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    closeBundle() {
      const indexFile = path.resolve(__dirname, 'dist/index.html');
      const fallbackFile = path.resolve(__dirname, 'dist/404.html');
      if (existsSync(indexFile)) copyFileSync(indexFile, fallbackFile);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback404()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
