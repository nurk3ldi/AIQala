var _a;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
var backendTarget = (_a = process.env.VITE_DEV_BACKEND_TARGET) !== null && _a !== void 0 ? _a : 'http://localhost:4000';
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        proxy: {
            '/api': {
                target: backendTarget,
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/api/, ''); },
            },
            '/uploads': {
                target: backendTarget,
                changeOrigin: true,
            },
        },
    },
    preview: {
        host: '0.0.0.0',
        port: 4173,
        strictPort: true,
    },
});
