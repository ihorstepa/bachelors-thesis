import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import path from 'path'

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
                target: 'ws://localhost:3002',
                ws: true,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/sync/, 'ws'),
            },
            '/api': {
                target: 'http://localhost:3002',
                changeOrigin: true,
            },
        },
    },
    worker: {
        format: 'es',
    },
})
