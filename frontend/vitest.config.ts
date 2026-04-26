import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    optimizeDeps: {
        include: ['react-router'],
        exclude: ['@wasmer/sdk'],
    },
    // COOP + COEP are required for SharedArrayBuffer, which Wasmer SDK needs.
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
    },
    worker: {
        format: 'es',
    },
    test: {
        browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
            screenshotFailures: false,
        },
        // Toolchain download + multi-file compilation can take several minutes.
        testTimeout: 10 * 60 * 1000,
        hookTimeout: 60_000,
        coverage: {
            provider: 'istanbul',
            include: ['src/**'],
            exclude: ['src/**/*.d.ts', 'src/vite-env.d.ts', 'src/index.tsx'],
            reporter: ['text', 'html'],
        },
    },
})
