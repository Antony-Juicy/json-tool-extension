import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * 构建出的 dist/ 就是可以直接加载的 Chrome 扩展：
 *  - app.html 是入口页，打包成 dist/app.html + dist/app.js
 *  - public/ 里的 manifest.json、background.js、icons/ 原样复制到 dist/
 */
export default defineConfig({
    base: './',
    plugins: [react()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        target: 'es2020',
        modulePreload: { polyfill: false },
        rollupOptions: {
            input: 'app.html',
            output: {
                entryFileNames: 'app.js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]',
            },
        },
    },
    server: { open: '/app.html' },
});
