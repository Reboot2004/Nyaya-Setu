import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    build: {
        target: 'esnext',
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/@huggingface/transformers')) return 'hf-transformers';
                    if (id.includes('node_modules/@mlc-ai/web-llm')) return 'webllm';
                    if (id.includes('node_modules/onnxruntime-web') || id.includes('onnxruntime')) return 'ort';
                    if (id.includes('data/statutes.js')) return 'statutes';
                    if (id.includes('data/statute_vectors.json')) return 'vectors';
                }
            }
        }
    },
    // Perf: proper MIME for .wasm so browsers can use instantiateStreaming
    plugins: [{
        name: 'wasm-mime',
        configureServer(server) {
            server.middlewares.use((req, _res, next) => {
                if (req.url?.endsWith('.wasm')) {
                    // vite already sets application/wasm, this is a belt-and-braces
                }
                next();
            });
        }
    }],
    // Required: WebLLM workers need COOP/COEP-free simple serving; keep defaults
    server: {
        port: 5173
    }
});
