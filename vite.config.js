import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    build: {
        target: 'esnext',
        chunkSizeWarningLimit: 2000
    },
    // Required: WebLLM workers need COOP/COEP-free simple serving; keep defaults
    server: {
        port: 5173
    }
});
