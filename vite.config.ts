import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const devUrl = process.env.APP_URL || '';
  const sharedUrl = process.env.SHARED_APP_URL || (devUrl.includes('ais-dev-') ? devUrl.replace('ais-dev-', 'ais-pre-') : '') || 'https://ais-pre-4ewykb3pq2vqg5p4h44jfk-301569695870.us-east5.run.app';

  return {
    define: {
      'import.meta.env.VITE_PUBLIC_APP_URL': JSON.stringify(sharedUrl),
      'import.meta.env.VITE_DEV_APP_URL': JSON.stringify(devUrl),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
