import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    optimizeDeps: {
        exclude: ['@wasmer/sdk'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
        proxy: {
            '/sync': {
                target: 'ws://127.0.0.1:3002',
                ws: true,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/sync/, 'ws'),
            },
            '/api': {
                target: 'http://127.0.0.1:3002',
                changeOrigin: true,
            },
        },
    },
    worker: {
        format: 'es',
    },
})
